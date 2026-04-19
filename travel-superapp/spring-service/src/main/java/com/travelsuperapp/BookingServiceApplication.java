package com.travelsuperapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Travel Super App — Spring Boot Booking Microservice
 * Handles: booking confirmation, payment logging, SOAP verification
 */
@SpringBootApplication
@EnableAsync
public class BookingServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(BookingServiceApplication.class, args);
    }
}
