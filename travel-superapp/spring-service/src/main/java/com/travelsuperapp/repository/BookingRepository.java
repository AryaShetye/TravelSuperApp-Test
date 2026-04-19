package com.travelsuperapp.repository;

import com.travelsuperapp.entity.BookingLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<BookingLog, String> {

    List<BookingLog> findByUserIdOrderByCreatedAtDesc(String userId);

    List<BookingLog> findByPropertyIdAndStatus(String propertyId, String status);

    Optional<BookingLog> findByIdAndUserId(String id, String userId);

    /**
     * Check for date conflicts on a property
     */
    @Query("""
        SELECT b FROM BookingLog b
        WHERE b.propertyId = :propertyId
        AND b.status IN ('pending', 'confirmed')
        AND b.checkIn < :checkOut
        AND b.checkOut > :checkIn
    """)
    List<BookingLog> findConflictingBookings(
        @Param("propertyId") String propertyId,
        @Param("checkIn") LocalDate checkIn,
        @Param("checkOut") LocalDate checkOut
    );

    long countByStatus(String status);
}
