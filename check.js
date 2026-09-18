import { db } from './src/lib/firebase.js'
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore'

async function check() {
  const meta = await getDoc(doc(db, 'meta', 'aggregates'))
  console.log("Aggregates:", meta.exists() ? meta.data() : "No doc")
  
  const students = await getDocs(collection(db, 'students'))
  console.log(`Total students in DB: ${students.size}`)
  
  // Re-calculate
  let mca = 0, msc = 0
  students.forEach(s => {
    if (s.data().batch === 'MCA') mca++
    if (s.data().batch === 'MSc CS') msc++
  })
  console.log(`Actual MCA: ${mca}, MSc: ${msc}`)

  process.exit(0)
}

check()
