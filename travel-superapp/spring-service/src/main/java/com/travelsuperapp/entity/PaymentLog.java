package com.travelsuperapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * PaymentLog Entity — mirrors the payments table
 * Spring Boot logs payment events for audit trail
 */
@Entity
@Table(name = "payments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentLog {

    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private String id;

    @Column(name = "booking_id", nullable = false)
    private String bookingId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "razorpay_order_id", unique = true)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id")
    private String razorpayPaymentId;

    @Column(name = "amount", precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "amount_in_paise")
    private Integer amountInPaise;

    @Column(name = "currency", length = 3)
    private String currency;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "method", length = 50)
    private String method;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
