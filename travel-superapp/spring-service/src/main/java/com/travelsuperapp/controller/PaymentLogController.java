package com.travelsuperapp.controller;

import com.travelsuperapp.dto.PaymentLogRequest;
import com.travelsuperapp.service.BookingConfirmationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Payment Log Controller
 * Receives payment events from Node.js backend for audit logging
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentLogController {

    private final BookingConfirmationService bookingService;

    /**
     * Log a payment event
     * POST /api/payments/log
     * Called by Node.js after successful payment verification
     */
    @PostMapping("/log")
    public ResponseEntity<Map<String, Object>> logPayment(@Valid @RequestBody PaymentLogRequest request) {
        log.info("Logging payment for booking: {} status: {}", request.getBookingId(), request.getStatus());

        // Async — doesn't block Node.js response
        bookingService.logPayment(request);

        return ResponseEntity.ok(Map.of(
            "received", true,
            "bookingId", request.getBookingId(),
            "message", "Payment log queued for processing"
        ));
    }
}
