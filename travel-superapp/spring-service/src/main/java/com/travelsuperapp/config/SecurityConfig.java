package com.travelsuperapp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security Configuration for Spring Boot Microservice
 * Internal service — uses basic auth for service-to-service calls
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Health check is public
                .requestMatchers("/actuator/health").permitAll()
                // SOAP endpoint is public (secured by network in production)
                .requestMatchers("/ws/**").permitAll()
                // All other endpoints require basic auth
                .anyRequest().authenticated()
            )
            .httpBasic(basic -> {});

        return http.build();
    }
}
