package com.travelsuperapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * BookingLog Entity — mirrors the bookings table managed by Node.js
 * Spring Boot reads this for confirmation and audit purposes
 */
@Entity
@Table(name = "bookings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingLog {

    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "property_id", nullable = false)
    private String propertyId;

    @Column(name = "property_name", nullable = false)
    private String propertyName;

    @Column(name = "property_location")
    private String propertyLocation;

    @Column(name = "check_in", nullable = false)
    private LocalDate checkIn;

    @Column(name = "check_out", nullable = false)
    private LocalDate checkOut;

    @Column(name = "guests", nullable = false)
    private Integer guests;

    @Column(name = "nights", nullable = false)
    private Integer nights;

    @Column(name = "price_per_night", precision = 10, scale = 2)
    private BigDecimal pricePerNight;

    @Column(name = "subtotal", precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "taxes", precision = 10, scale = 2)
    private BigDecimal taxes;

    @Column(name = "total_amount", precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "currency", length = 3)
    private String currency;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "special_requests", columnDefinition = "TEXT")
    private String specialRequests;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
