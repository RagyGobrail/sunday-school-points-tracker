package com.coptic.sundayschool.data.model

import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.ServerTimestamp
import java.util.Date

enum class ScoreCategory(val titleArabic: String) {
    LITURGY("القداس"),
    ATTENDANCE("الحضور"),
    PARTICIPATION("المشاركة")
}

data class LeaderUser(
    val uid: String = "",
    val email: String = "",
    val displayName: String = "",
    val photoURL: String = "",
    val role: String = "leader", // "admin" or "leader"
    val isAuthorized: Boolean = false,
    val createdAt: String = "",
    val lastLoginAt: String = ""
)

data class Child(
    @DocumentId
    val id: String = "",
    val name: String = "",
    val photoUrl: String = "",
    val totalPoints: Int = 0,
    val liturgyPoints: Int = 0,
    val attendancePoints: Int = 0,
    val participationPoints: Int = 0,
    val lastScoreDate: String = "",
    val createdAt: String = "",
    val updatedAt: String = ""
)

data class ScoreRecord(
    @DocumentId
    val id: String = "",
    val childId: String = "",
    val childName: String = "",
    val category: String = "liturgy",
    val points: Int = 0,
    val weekId: String = "",
    val weekDate: String = "",
    val leaderId: String = "",
    val leaderName: String = "",
    val note: String = "",
    val createdAt: String = ""
)
