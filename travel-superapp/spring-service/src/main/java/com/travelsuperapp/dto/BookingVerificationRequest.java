package com.travelsuperapp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO for SOAP booking verification requests
 */
@Data
public class BookingVerificationRequest {

    @NotBlank(message = "Booking ID is required")
    private String bookingId;

    private String userId;
}
