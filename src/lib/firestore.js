import { db } from './firebase.js'
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, addDoc, serverTimestamp,
  runTransaction, writeBatch, query, orderBy, limit,
  increment,
} from 'firebase/firestore'

/* ─────────────── ROLES ─────────────── */

export async function getUserRole(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data().role : null // 'student' | 'viewer'
}

export async function setUserRole(uid, role) {
  await setDoc(doc(db, 'users', uid), { role, updatedAt: serverTimestamp() }, { merge: true })
}

/** Completely delete a user's data from Firestore (students, projects, certs, users, aggregates) */
export async function deleteAccountData(uid) {
  const batchTx = writeBatch(db)
  
  // 1. Fetch student doc to get batch and skillIds
  const studentSnap = await getDoc(doc(db, 'students', uid))
  if (studentSnap.exists()) {
    const data = studentSnap.data()
    
    // Decrement aggregate
    if (data.batch) {
      const aggField = data.batch === 'MCA' ? 'mcaCount' : 'mscCount'
      batchTx.update(doc(db, 'meta', 'aggregates'), { [aggField]: increment(-1) })
    }

    // Decrement skill usage counts
    const skillIds = data.skillIds || []
    for (const skillId of skillIds) {
      batchTx.update(doc(db, 'skills', skillId), { usageCount: increment(-1) })
    }
  }

  // 2. Fetch and delete all projects
  const projSnap = await getDocs(collection(db, 'students', uid, 'projects'))
  projSnap.forEach(d => batchTx.delete(d.ref))

  // 3. Fetch and delete all certs
  const certSnap = await getDocs(collection(db, 'students', uid, 'certs'))
  certSnap.forEach(d => batchTx.delete(d.ref))

  // 4. Delete the student doc itself
  batchTx.delete(doc(db, 'students', uid))

  // 5. Delete the user role doc
  batchTx.delete(doc(db, 'users', uid))

  // Commit everything atomically
  await batchTx.commit()
}

/* ─────────────── STUDENTS ─────────────── */

export async function getStudent(uid) {
  const snap = await getDoc(doc(db, 'students', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function createStudent(uid, data) {
  const ref = doc(db, 'students', uid)
  const snap = await getDoc(ref)
  const isNew = !snap.exists()
  
  await setDoc(ref, {
    ...data,
    createdAt: isNew ? serverTimestamp() : snap.data().createdAt,
    updatedAt: serverTimestamp(),
  })
  
  // Only increment if it's genuinely a new profile
  if (isNew) {
    await updateAggregates(data.batch, 1)
  }
}

export async function updateStudent(uid, data) {
  const ref = doc(db, 'students', uid)
  const snap = await getDoc(ref)
  
  if (snap.exists()) {
    const oldBatch = snap.data().batch
    const newBatch = data.batch
    
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    })
    
    // Adjust aggregates if they changed their batch
    if (oldBatch && newBatch && oldBatch !== newBatch) {
      await updateAggregates(oldBatch, -1)
      await updateAggregates(newBatch, 1)
    }
  } else {
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }
}

/** Returns all students (auth required via rules) */
export async function getAllStudents() {
  const snap = await getDocs(collection(db, 'students'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/* ─────────────── PROJECTS ─────────────── */

export async function getProjects(uid) {
  const snap = await getDocs(collection(db, 'students', uid, 'projects'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addProject(uid, data) {
  return addDoc(collection(db, 'students', uid, 'projects'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function updateProject(uid, projectId, data) {
  return updateDoc(doc(db, 'students', uid, 'projects', projectId), data)
}

export async function deleteProject(uid, projectId) {
  return deleteDoc(doc(db, 'students', uid, 'projects', projectId))
}

/* ─────────────── CERTIFICATIONS ─────────────── */

export async function getCerts(uid) {
  const snap = await getDocs(collection(db, 'students', uid, 'certs'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addCert(uid, data) {
  return addDoc(collection(db, 'students', uid, 'certs'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function updateCert(uid, certId, data) {
  return updateDoc(doc(db, 'students', uid, 'certs', certId), data)
}

export async function deleteCert(uid, certId) {
  return deleteDoc(doc(db, 'students', uid, 'certs', certId))
}

/* ─────────────── SKILLS ─────────────── */

/** Fetch all skills (public) */
export async function getAllSkills() {
  const snap = await getDocs(collection(db, 'skills'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Add an existing skill to a student in a transaction:
 * - appends skillId to student.skillIds
 * - increments skills/{skillId}.usageCount
 */
export async function addSkillToStudent(uid, skillId) {
  await runTransaction(db, async (tx) => {
    const studentRef = doc(db, 'students', uid)
    const skillRef   = doc(db, 'skills', skillId)
    const studentSnap = await tx.get(studentRef)
    const existing = studentSnap.data()?.skillIds ?? []
    if (existing.includes(skillId)) return
    tx.update(studentRef, { skillIds: [...existing, skillId], updatedAt: serverTimestamp() })
    tx.update(skillRef, { usageCount: increment(1) })
  })
}

/**
 * Create a brand-new skill and attach it to the student atomically.
 */
export async function createAndAddSkill(uid, skillName) {
  const skillRef   = doc(collection(db, 'skills'))
  const studentRef = doc(db, 'students', uid)
  await runTransaction(db, async (tx) => {
    const studentSnap = await tx.get(studentRef)
    const existing = studentSnap.data()?.skillIds ?? []
    tx.set(skillRef, {
      name: skillName,
      nameLower: skillName.toLowerCase(),
      usageCount: 1,
      createdAt: serverTimestamp(),
    })
    tx.update(studentRef, { skillIds: [...existing, skillRef.id], updatedAt: serverTimestamp() })
  })
  return skillRef.id
}

/**
 * Remove a skill from student, decrement usageCount.
 */
export async function removeSkillFromStudent(uid, skillId) {
  await runTransaction(db, async (tx) => {
    const studentRef = doc(db, 'students', uid)
    const skillRef   = doc(db, 'skills', skillId)
    const studentSnap = await tx.get(studentRef)
    const existing = studentSnap.data()?.skillIds ?? []
    tx.update(studentRef, {
      skillIds: existing.filter(id => id !== skillId),
      updatedAt: serverTimestamp(),
    })
    tx.update(skillRef, { usageCount: increment(-1) })
  })
}

/**
 * Admin only: Delete a skill globally.
 */
export async function deleteSkill(skillId) {
  await deleteDoc(doc(db, 'skills', skillId))
}

/* ─────────────── PUBLIC AGGREGATES ─────────────── */

export async function getAggregates() {
  const snap = await getDoc(doc(db, 'meta', 'aggregates'))
  return snap.exists() ? snap.data() : { mcaCount: 0, mscCount: 0 }
}

export async function updateAggregates(batch, delta) {
  const ref = doc(db, 'meta', 'aggregates')
  const field = batch === 'MCA' ? 'mcaCount' : 'mscCount'
  try {
    await updateDoc(ref, { [field]: increment(delta) })
  } catch {
    // Doc doesn't exist yet — create it
    await setDoc(ref, { mcaCount: 0, mscCount: 0, [field]: delta < 0 ? 0 : delta })
  }
}
