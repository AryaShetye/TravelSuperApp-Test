package com.travelsuperapp.controller;

import com.travelsuperapp.dto.BookingVerificationRequest;
import com.travelsuperapp.service.BookingConfirmationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Booking REST Controller
 * Endpoints called by Node.js backend for verification and stats
 */
@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Slf4j
public class BookingController {

    private final BookingConfirmationService bookingService;

    /**
     * Verify a booking — called by Node.js or external systems
     * GET /api/bookings/verify/{bookingId}
     */
    @GetMapping("/verify/{bookingId}")
    public ResponseEntity<Map<String, Object>> verifyBooking(@PathVariable String bookingId) {
        log.info("Verifying booking: {}", bookingId);
        Map<String, Object> result = bookingService.verifyBooking(bookingId);
        return ResponseEntity.ok(result);
    }

    /**
     * Initiate refund (called by Node.js on cancellation)
     * POST /api/bookings/refund
     */
    @PostMapping("/refund")
    public ResponseEntity<Map<String, Object>> initiateRefund(@RequestBody Map<String, Object> request) {
        String bookingId = (String) request.get("bookingId");
        log.info("Refund initiated for booking: {}", bookingId);

        // In production: call Razorpay refund API here
        // For now, log and return success
        return ResponseEntity.ok(Map.of(
            "success", true,
            "bookingId", bookingId,
            "message", "Refund initiated. Will be processed in 5-7 business days."
        ));
    }

    /**
     * Get booking statistics
     * GET /api/bookings/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        return ResponseEntity.ok(bookingService.getStats());
    }
}
