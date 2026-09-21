import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  runTransaction,
  query, 
  orderBy, 
  where,
  serverTimestamp,
  collectionGroup
} from 'firebase/firestore';
import { db } from '../firebase';
import { Child, ScoreRecord, ScoreCategory, Gender } from '../types';

/**
 * Children Firestore Service
 * Supports realtime listeners, atomic scoring transactions, and history preservation.
 */

// Realtime listener for all children
export function subscribeToChildren(
  onUpdate: (children: Child[]) => void,
  onError?: (err: Error) => void
) {
  const childrenCol = collection(db, 'children');
  return onSnapshot(
    childrenCol,
    (snapshot) => {
      const list: Child[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || '',
          gender: data.gender === 'girl' ? 'girl' : 'boy',
          photoUrl: data.photoUrl || '',
          totalPoints: Number(data.totalPoints || 0),
          liturgyPoints: Number(data.liturgyPoints || 0),
          attendancePoints: Number(data.attendancePoints || 0),
          participationPoints: Number(data.participationPoints || 0),
          lastScoreDate: data.lastScoreDate || '',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || ''
        });
      });
      // Sort alphabetically by name
      list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      onUpdate(list);
    },
    (err) => {
      console.error('Children snapshot error:', err);
      onError?.(err);
    }
  );
}

// Add a new child
export async function addChild(name: string, gender: Gender = 'boy', photoUrl?: string): Promise<string> {
  const childrenCol = collection(db, 'children');
  const now = new Date().toISOString();
  const docRef = await addDoc(childrenCol, {
    name: name.trim(),
    gender: gender === 'girl' ? 'girl' : 'boy',
    photoUrl: photoUrl || '',
    totalPoints: 0,
    liturgyPoints: 0,
    attendancePoints: 0,
    participationPoints: 0,
    createdAt: now,
    updatedAt: now
  });
  return docRef.id;
}

// Update child name, gender or photo
export async function updateChild(childId: string, updates: Partial<Pick<Child, 'name' | 'gender' | 'photoUrl'>>): Promise<void> {
  const childRef = doc(db, 'children', childId);
  await updateDoc(childRef, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
}

// Delete child and their score subcollection
export async function deleteChild(childId: string): Promise<void> {
  const childRef = doc(db, 'children', childId);
  const scoresCol = collection(db, 'children', childId, 'scores');
  const scoresSnap = await getDocs(scoresCol);
  
  // Delete all nested scores
  const deletePromises = scoresSnap.docs.map(s => deleteDoc(s.ref));
  await Promise.all(deletePromises);

  // Delete child doc
  await deleteDoc(childRef);
}

/**
 * Add points to a child using Firestore Atomic Transaction.
 * 1. Creates a new immutable ScoreRecord inside children/{childId}/scores/{scoreId}
 * 2. Atomically increments the child's cached totals (totalPoints, category points)
 *    so multiple leaders updating concurrently won't lose points or conflict.
 */
export async function addScoreRecord(params: {
  childId: string;
  childName?: string;
  category: ScoreCategory;
  points: number;
  weekId: string;
  weekDate: string;
  leaderId: string;
  leaderName: string;
  note?: string;
}): Promise<string> {
  const childRef = doc(db, 'children', params.childId);
  const scoresCol = collection(db, 'children', params.childId, 'scores');
  const newScoreRef = doc(scoresCol);
  const now = new Date().toISOString();

  await runTransaction(db, async (transaction) => {
    const childDoc = await transaction.get(childRef);
    if (!childDoc.exists()) {
      throw new Error('الطفل غير موجود');
    }

    const currentData = childDoc.data();
    const currentTotal = Number(currentData.totalPoints || 0);
    const currentCatPoints = Number(
      params.category === 'liturgy'
        ? currentData.liturgyPoints || 0
        : params.category === 'attendance'
        ? currentData.attendancePoints || 0
        : currentData.participationPoints || 0
    );

    // 1. Create score record
    transaction.set(newScoreRef, {
      id: newScoreRef.id,
      childId: params.childId,
      childName: params.childName || currentData.name || '',
      category: params.category,
      points: params.points,
      weekId: params.weekId,
      weekDate: params.weekDate,
      leaderId: params.leaderId,
      leaderName: params.leaderName,
      note: params.note || '',
      createdAt: now
    });

    // 2. Update child document totals atomically
    const updatePayload: any = {
      totalPoints: currentTotal + params.points,
      lastScoreDate: now,
      updatedAt: now
    };

    if (params.category === 'liturgy') {
      updatePayload.liturgyPoints = currentCatPoints + params.points;
    } else if (params.category === 'attendance') {
      updatePayload.attendancePoints = currentCatPoints + params.points;
    } else if (params.category === 'participation') {
      updatePayload.participationPoints = currentCatPoints + params.points;
    }

    transaction.update(childRef, updatePayload);
  });

  return newScoreRef.id;
}

/**
 * Add multiple category points (liturgy, attendance, participation) for a child in a single atomic transaction.
 */
export async function addBatchScoresForChild(params: {
  childId: string;
  childName?: string;
  scores: Array<{
    category: ScoreCategory;
    points: number;
    note?: string;
  }>;
  weekId: string;
  weekDate: string;
  leaderId: string;
  leaderName: string;
}): Promise<void> {
  const activeScores = params.scores.filter(s => s.points > 0);
  if (activeScores.length === 0) {
    throw new Error('يرجى إدخال نقاط موجبة في خانة واحدة على الأقل');
  }

  const childRef = doc(db, 'children', params.childId);
  const scoresCol = collection(db, 'children', params.childId, 'scores');
  const now = new Date().toISOString();

  await runTransaction(db, async (transaction) => {
    const childDoc = await transaction.get(childRef);
    if (!childDoc.exists()) {
      throw new Error('الطفل غير موجود');
    }

    const currentData = childDoc.data();
    let newTotal = Number(currentData.totalPoints || 0);
    let newLiturgy = Number(currentData.liturgyPoints || 0);
    let newAttendance = Number(currentData.attendancePoints || 0);
    let newParticipation = Number(currentData.participationPoints || 0);

    for (const item of activeScores) {
      const newScoreRef = doc(scoresCol);
      transaction.set(newScoreRef, {
        id: newScoreRef.id,
        childId: params.childId,
        childName: params.childName || currentData.name || '',
        category: item.category,
        points: item.points,
        weekId: params.weekId,
        weekDate: params.weekDate,
        leaderId: params.leaderId,
        leaderName: params.leaderName,
        note: item.note || '',
        createdAt: now
      });

      newTotal += item.points;
      if (item.category === 'liturgy') newLiturgy += item.points;
      if (item.category === 'attendance') newAttendance += item.points;
      if (item.category === 'participation') newParticipation += item.points;
    }

    transaction.update(childRef, {
      totalPoints: newTotal,
      liturgyPoints: newLiturgy,
      attendancePoints: newAttendance,
      participationPoints: newParticipation,
      lastScoreDate: now,
      updatedAt: now
    });
  });
}

/**
 * Edit or delete a score record with transaction safety to re-adjust the child's totals accurately.
 */
export async function updateScoreRecord(params: {
  childId: string;
  scoreId: string;
  newPoints: number;
  newCategory?: ScoreCategory;
}): Promise<void> {
  const childRef = doc(db, 'children', params.childId);
  const scoreRef = doc(db, 'children', params.childId, 'scores', params.scoreId);

  await runTransaction(db, async (transaction) => {
    const scoreDoc = await transaction.get(scoreRef);
    const childDoc = await transaction.get(childRef);
    if (!scoreDoc.exists() || !childDoc.exists()) {
      throw new Error('السجل غير موجود');
    }

    const oldScore = scoreDoc.data() as ScoreRecord;
    const childData = childDoc.data();

    const oldPoints = Number(oldScore.points || 0);
    const oldCat = oldScore.category;
    const targetCat = params.newCategory || oldCat;
    const diff = params.newPoints - oldPoints;

    // Update the score doc
    transaction.update(scoreRef, {
      points: params.newPoints,
      category: targetCat,
      updatedAt: new Date().toISOString()
    });

    // Adjust child totals
    const updates: any = {
      totalPoints: Number(childData.totalPoints || 0) + diff,
      updatedAt: new Date().toISOString()
    };

    if (oldCat === targetCat) {
      if (oldCat === 'liturgy') updates.liturgyPoints = Number(childData.liturgyPoints || 0) + diff;
      if (oldCat === 'attendance') updates.attendancePoints = Number(childData.attendancePoints || 0) + diff;
      if (oldCat === 'participation') updates.participationPoints = Number(childData.participationPoints || 0) + diff;
    } else {
      // Swapped category
      if (oldCat === 'liturgy') updates.liturgyPoints = Number(childData.liturgyPoints || 0) - oldPoints;
      if (oldCat === 'attendance') updates.attendancePoints = Number(childData.attendancePoints || 0) - oldPoints;
      if (oldCat === 'participation') updates.participationPoints = Number(childData.participationPoints || 0) - oldPoints;

      if (targetCat === 'liturgy') updates.liturgyPoints = Number(updates.liturgyPoints ?? childData.liturgyPoints ?? 0) + params.newPoints;
      if (targetCat === 'attendance') updates.attendancePoints = Number(updates.attendancePoints ?? childData.attendancePoints ?? 0) + params.newPoints;
      if (targetCat === 'participation') updates.participationPoints = Number(updates.participationPoints ?? childData.participationPoints ?? 0) + params.newPoints;
    }

    transaction.update(childRef, updates);
  });
}

/**
 * Delete a score record and deduct its points from child totals
 */
export async function deleteScoreRecord(childId: string, scoreId: string): Promise<void> {
  const childRef = doc(db, 'children', childId);
  const scoreRef = doc(db, 'children', childId, 'scores', scoreId);

  await runTransaction(db, async (transaction) => {
    const scoreDoc = await transaction.get(scoreRef);
    const childDoc = await transaction.get(childRef);
    if (!scoreDoc.exists() || !childDoc.exists()) {
      return;
    }

    const oldScore = scoreDoc.data() as ScoreRecord;
    const childData = childDoc.data();
    const oldPoints = Number(oldScore.points || 0);
    const oldCat = oldScore.category;

    transaction.delete(scoreRef);

    const updates: any = {
      totalPoints: Math.max(0, Number(childData.totalPoints || 0) - oldPoints),
      updatedAt: new Date().toISOString()
    };

    if (oldCat === 'liturgy') {
      updates.liturgyPoints = Math.max(0, Number(childData.liturgyPoints || 0) - oldPoints);
    } else if (oldCat === 'attendance') {
      updates.attendancePoints = Math.max(0, Number(childData.attendancePoints || 0) - oldPoints);
    } else if (oldCat === 'participation') {
      updates.participationPoints = Math.max(0, Number(childData.participationPoints || 0) - oldPoints);
    }

    transaction.update(childRef, updates);
  });
}

/**
 * Subscribe to scores of a specific child in realtime
 */
export function subscribeToChildScores(
  childId: string,
  onUpdate: (scores: ScoreRecord[]) => void
) {
  const scoresCol = collection(db, 'children', childId, 'scores');
  const q = query(scoresCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: ScoreRecord[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        childId: data.childId || childId,
        childName: data.childName || '',
        category: data.category as ScoreCategory,
        points: Number(data.points || 0),
        weekId: data.weekId || '',
        weekDate: data.weekDate || '',
        leaderId: data.leaderId || '',
        leaderName: data.leaderName || '',
        createdAt: data.createdAt || '',
        note: data.note || ''
      });
    });
    onUpdate(list);
  }, (err) => {
    console.error(`Error loading scores for child ${childId}:`, err);
  });
}

/**
 * Fetch all scores across all children for a specific week or all weeks
 */
export async function fetchAllScoresForWeek(weekId?: string): Promise<ScoreRecord[]> {
  try {
    const scoresQuery = collectionGroup(db, 'scores');
    const snapshot = await getDocs(scoresQuery);
    const list: ScoreRecord[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (!weekId || data.weekId === weekId) {
        list.push({
          id: docSnap.id,
          childId: data.childId,
          childName: data.childName || '',
          category: data.category as ScoreCategory,
          points: Number(data.points || 0),
          weekId: data.weekId || '',
          weekDate: data.weekDate || '',
          leaderId: data.leaderId || '',
          leaderName: data.leaderName || '',
          createdAt: data.createdAt || '',
          note: data.note || ''
        });
      }
    });
    // Sort by newest
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (e) {
    console.warn('Collection group query error, falling back:', e);
    return [];
  }
}

/**
 * Recalculate and synchronize child totals directly from their scoring history
 * Useful if any consistency audit or class reset is requested by Admin
 */
export async function recalculateChildScores(childId: string): Promise<void> {
  const childRef = doc(db, 'children', childId);
  const scoresCol = collection(db, 'children', childId, 'scores');
  const snap = await getDocs(scoresCol);

  let total = 0;
  let liturgy = 0;
  let attendance = 0;
  let participation = 0;

  snap.forEach(d => {
    const data = d.data();
    const pts = Number(data.points || 0);
    total += pts;
    if (data.category === 'liturgy') liturgy += pts;
    if (data.category === 'attendance') attendance += pts;
    if (data.category === 'participation') participation += pts;
  });

  await updateDoc(childRef, {
    totalPoints: total,
    liturgyPoints: liturgy,
    attendancePoints: attendance,
    participationPoints: participation,
    updatedAt: new Date().toISOString()
  });
}
