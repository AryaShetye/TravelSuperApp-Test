package com.travelsuperapp.repository;

import com.travelsuperapp.entity.PaymentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<PaymentLog, String> {

    Optional<PaymentLog> findByBookingId(String bookingId);

    Optional<PaymentLog> findByRazorpayOrderId(String razorpayOrderId);

    Optional<PaymentLog> findByRazorpayPaymentId(String razorpayPaymentId);
}
