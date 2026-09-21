package com.coptic.sundayschool.data.repository

import com.coptic.sundayschool.data.model.Child
import com.coptic.sundayschool.data.model.ScoreCategory
import com.coptic.sundayschool.data.model.ScoreRecord
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*

class SundaySchoolRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val childrenCol = firestore.collection("children")

    /**
     * Real-time flow of all children sorted by total points descending (leaderboard)
     * or by name
     */
    fun getChildrenFlow(): Flow<List<Child>> = callbackFlow {
        val listener = childrenCol.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            val list = snapshot?.documents?.mapNotNull { it.toObject(Child::class.java) } ?: emptyList()
            trySend(list)
        }
        awaitClose { listener.remove() }
    }

    /**
     * Add new child
     */
    suspend fun addChild(name: String, photoUrl: String = ""): String {
        val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
        val child = Child(
            name = name.trim(),
            photoUrl = photoUrl,
            totalPoints = 0,
            liturgyPoints = 0,
            attendancePoints = 0,
            participationPoints = 0,
            createdAt = now,
            updatedAt = now
        )
        val docRef = childrenCol.add(child).await()
        return docRef.id
    }

    /**
     * Add points atomically using a Firestore transaction
     * Preserves scoring history in subcollection while updating child totals
     */
    suspend fun addScoreRecord(
        childId: String,
        childName: String,
        category: ScoreCategory,
        points: Int,
        weekId: String,
        weekDate: String,
        leaderId: String,
        leaderName: String,
        note: String = ""
    ) {
        val childRef = childrenCol.document(childId)
        val scoreRef = childRef.collection("scores").document()
        val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())

        firestore.runTransaction { transaction ->
            val snapshot = transaction.get(childRef)
            val currentTotal = snapshot.getLong("totalPoints")?.toInt() ?: 0
            val currentLiturgy = snapshot.getLong("liturgyPoints")?.toInt() ?: 0
            val currentAttendance = snapshot.getLong("attendancePoints")?.toInt() ?: 0
            val currentParticipation = snapshot.getLong("participationPoints")?.toInt() ?: 0

            val scoreRecord = hashMapOf(
                "id" to scoreRef.id,
                "childId" to childId,
                "childName" to childName,
                "category" to category.name.lowercase(Locale.ROOT),
                "points" to points,
                "weekId" to weekId,
                "weekDate" to weekDate,
                "leaderId" to leaderId,
                "leaderName" to leaderName,
                "note" to note,
                "createdAt" to now
            )
            transaction.set(scoreRef, scoreRecord)

            val updates = mutableMapOf<String, Any>(
                "totalPoints" to (currentTotal + points),
                "lastScoreDate" to now,
                "updatedAt" to now
            )

            when (category) {
                ScoreCategory.LITURGY -> updates["liturgyPoints"] = currentLiturgy + points
                ScoreCategory.ATTENDANCE -> updates["attendancePoints"] = currentAttendance + points
                ScoreCategory.PARTICIPATION -> updates["participationPoints"] = currentParticipation + points
            }

            transaction.update(childRef, updates)
        }.await()
    }

    /**
     * Get real-time flow of scores for a specific child
     */
    fun getChildScoresFlow(childId: String): Flow<List<ScoreRecord>> = callbackFlow {
        val scoresCol = childrenCol.document(childId).collection("scores")
            .orderBy("createdAt", Query.Direction.DESCENDING)

        val listener = scoresCol.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            val list = snapshot?.documents?.mapNotNull { it.toObject(ScoreRecord::class.java) } ?: emptyList()
            trySend(list)
        }
        awaitClose { listener.remove() }
    }
}
