package com.travelsuperapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

/**
 * DTO for payment log requests from Node.js backend
 */
@Data
public class PaymentLogRequest {

    @NotBlank(message = "Booking ID is required")
    private String bookingId;

    @NotBlank(message = "Payment ID is required")
    private String paymentId;

    @NotBlank(message = "Order ID is required")
    private String orderId;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private BigDecimal amount;

    @NotBlank(message = "Status is required")
    private String status;

    private String userId;
    private String currency = "INR";
    private String method;
}
