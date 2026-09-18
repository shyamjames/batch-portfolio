import { db } from './src/lib/firebase.js'
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'

async function fix() {
  const students = await getDocs(collection(db, 'students'))
  let mca = 0, msc = 0
  
  students.forEach(s => {
    if (s.data().batch === 'MCA') mca++
    if (s.data().batch === 'MSc CS') msc++
  })
  
  console.log(`Setting MCA: ${mca}, MSc: ${msc}`)
  
  await setDoc(doc(db, 'meta', 'aggregates'), {
    mcaCount: mca,
    mscCount: msc
  })
  
  console.log("Fixed.")
  process.exit(0)
}

fix()
