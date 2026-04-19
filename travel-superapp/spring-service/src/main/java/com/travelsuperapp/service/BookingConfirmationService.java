package com.travelsuperapp.service;

import com.travelsuperapp.dto.PaymentLogRequest;
import com.travelsuperapp.entity.BookingLog;
import com.travelsuperapp.entity.PaymentLog;
import com.travelsuperapp.repository.BookingRepository;
import com.travelsuperapp.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Booking Confirmation Service
 * Handles payment logging and booking verification
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingConfirmationService {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;

    /**
     * Log a payment event from Node.js backend
     * Called asynchronously — doesn't block the main payment flow
     */
    @Async
    @Transactional
    public void logPayment(PaymentLogRequest request) {
        try {
            // Check if payment log already exists
            Optional<PaymentLog> existing = paymentRepository.findByRazorpayOrderId(request.getOrderId());

            if (existing.isPresent()) {
                // Update existing record
                PaymentLog payment = existing.get();
                payment.setStatus(request.getStatus());
                payment.setRazorpayPaymentId(request.getPaymentId());
                payment.setMethod(request.getMethod());
                if ("paid".equals(request.getStatus())) {
                    payment.setPaidAt(LocalDateTime.now());
                }
                paymentRepository.save(payment);
                log.info("Updated payment log for order: {}", request.getOrderId());
            } else {
                // Create new payment log
                PaymentLog payment = PaymentLog.builder()
                        .id(UUID.randomUUID().toString())
                        .bookingId(request.getBookingId())
                        .userId(request.getUserId())
                        .razorpayOrderId(request.getOrderId())
                        .razorpayPaymentId(request.getPaymentId())
                        .amount(request.getAmount())
                        .amountInPaise(request.getAmount().multiply(java.math.BigDecimal.valueOf(100)).intValue())
                        .currency(request.getCurrency())
                        .status(request.getStatus())
                        .method(request.getMethod())
                        .paidAt("paid".equals(request.getStatus()) ? LocalDateTime.now() : null)
                        .build();

                paymentRepository.save(payment);
                log.info("Created payment log for booking: {}", request.getBookingId());
            }
        } catch (Exception e) {
            log.error("Failed to log payment for booking {}: {}", request.getBookingId(), e.getMessage());
        }
    }

    /**
     * Verify a booking exists and is confirmed
     * Used by SOAP endpoint
     */
    @Transactional(readOnly = true)
    public Map<String, Object> verifyBooking(String bookingId) {
        Optional<BookingLog> bookingOpt = bookingRepository.findById(bookingId);

        if (bookingOpt.isEmpty()) {
            return Map.of(
                "verified", false,
                "message", "Booking not found",
                "bookingId", bookingId
            );
        }

        BookingLog booking = bookingOpt.get();
        boolean isConfirmed = "confirmed".equals(booking.getStatus());

        return Map.of(
            "verified", isConfirmed,
            "bookingId", bookingId,
            "status", booking.getStatus(),
            "propertyName", booking.getPropertyName(),
            "checkIn", booking.getCheckIn().toString(),
            "checkOut", booking.getCheckOut().toString(),
            "totalAmount", booking.getTotalAmount(),
            "message", isConfirmed ? "Booking is confirmed" : "Booking is not confirmed"
        );
    }

    /**
     * Get booking statistics
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getStats() {
        return Map.of(
            "total", bookingRepository.count(),
            "confirmed", bookingRepository.countByStatus("confirmed"),
            "pending", bookingRepository.countByStatus("pending"),
            "cancelled", bookingRepository.countByStatus("cancelled")
        );
    }
}
