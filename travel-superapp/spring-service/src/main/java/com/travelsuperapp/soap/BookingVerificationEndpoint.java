package com.travelsuperapp.soap;

import com.travelsuperapp.service.BookingConfirmationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ws.server.endpoint.annotation.Endpoint;
import org.springframework.ws.server.endpoint.annotation.PayloadRoot;
import org.springframework.ws.server.endpoint.annotation.RequestPayload;
import org.springframework.ws.server.endpoint.annotation.ResponsePayload;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.parsers.DocumentBuilderFactory;
import java.util.Map;

/**
 * SOAP Endpoint — verifyBooking
 * Demonstrates enterprise SOAP integration
 *
 * WSDL available at: http://localhost:8080/ws/booking.wsdl
 *
 * Example SOAP request:
 * <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
 *                   xmlns:book="http://travelsuperapp.com/booking">
 *   <soapenv:Body>
 *     <book:verifyBookingRequest>
 *       <book:bookingId>YOUR-BOOKING-UUID</book:bookingId>
 *     </book:verifyBookingRequest>
 *   </soapenv:Body>
 * </soapenv:Envelope>
 */
@Endpoint
@RequiredArgsConstructor
@Slf4j
public class BookingVerificationEndpoint {

    private static final String NAMESPACE_URI = "http://travelsuperapp.com/booking";

    private final BookingConfirmationService bookingService;

    @PayloadRoot(namespace = NAMESPACE_URI, localPart = "verifyBookingRequest")
    @ResponsePayload
    public Element verifyBooking(@RequestPayload Element request) throws Exception {
        // Extract bookingId from SOAP request
        String bookingId = request.getElementsByTagNameNS(NAMESPACE_URI, "bookingId")
                .item(0)
                .getTextContent();

        log.info("SOAP verifyBooking request for: {}", bookingId);

        // Call service
        Map<String, Object> result = bookingService.verifyBooking(bookingId);

        // Build SOAP response
        Document doc = DocumentBuilderFactory.newInstance()
                .newDocumentBuilder()
                .newDocument();

        Element response = doc.createElementNS(NAMESPACE_URI, "verifyBookingResponse");

        addElement(doc, response, "verified", result.get("verified").toString());
        addElement(doc, response, "bookingId", bookingId);
        addElement(doc, response, "status", result.getOrDefault("status", "unknown").toString());
        addElement(doc, response, "message", result.get("message").toString());
        addElement(doc, response, "propertyName", result.getOrDefault("propertyName", "").toString());
        addElement(doc, response, "checkIn", result.getOrDefault("checkIn", "").toString());
        addElement(doc, response, "checkOut", result.getOrDefault("checkOut", "").toString());

        return response;
    }

    private void addElement(Document doc, Element parent, String name, String value) {
        Element el = doc.createElementNS(NAMESPACE_URI, name);
        el.setTextContent(value);
        parent.appendChild(el);
    }
}
