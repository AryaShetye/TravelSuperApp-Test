-- ============================================================
-- Travel Super App — PostgreSQL Schema
-- Run this ONCE to set up the database manually if needed.
-- Sequelize sync handles this automatically in development.
-- ============================================================

-- Create database (run as postgres superuser)
-- CREATE DATABASE travel_superapp;
-- CREATE USER travel_user WITH ENCRYPTED PASSWORD 'travel_pass_2024';
-- GRANT ALL PRIVILEGES ON DATABASE travel_superapp TO travel_user;

-- Connect to travel_superapp before running the rest:
-- \c travel_superapp

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name      VARCHAR(50)  NOT NULL,
    last_name       VARCHAR(50)  NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    role            VARCHAR(20)  NOT NULL DEFAULT 'traveler'
                    CHECK (role IN ('traveler', 'host', 'driver', 'agent', 'admin')),
    avatar          VARCHAR(500),
    is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    preferred_language  VARCHAR(10) DEFAULT 'en',
    preferred_currency  VARCHAR(3)  DEFAULT 'INR',
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ─── Bookings ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id         VARCHAR(24)  NOT NULL,   -- MongoDB ObjectId
    property_name       VARCHAR(200) NOT NULL,
    property_location   VARCHAR(300),
    check_in            DATE         NOT NULL,
    check_out           DATE         NOT NULL,
    guests              INTEGER      NOT NULL DEFAULT 1 CHECK (guests BETWEEN 1 AND 20),
    nights              INTEGER      NOT NULL,
    price_per_night     NUMERIC(10,2) NOT NULL,
    subtotal            NUMERIC(10,2) NOT NULL,
    taxes               NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(10,2) NOT NULL,
    currency            VARCHAR(3)   NOT NULL DEFAULT 'INR',
    status              VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','confirmed','cancelled','completed','refunded')),
    special_requests    TEXT,
    cancellation_reason TEXT,
    confirmed_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_checkout_after_checkin CHECK (check_out > check_in)
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id    ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates       ON bookings(check_in, check_out);

-- ─── Payments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id              UUID         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id                 UUID         NOT NULL REFERENCES users(id),
    razorpay_order_id       VARCHAR(100) NOT NULL UNIQUE,
    razorpay_payment_id     VARCHAR(100),
    razorpay_signature      VARCHAR(500),
    amount                  NUMERIC(10,2) NOT NULL,
    amount_in_paise         INTEGER      NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'INR',
    status                  VARCHAR(20)  NOT NULL DEFAULT 'created'
                            CHECK (status IN ('created','paid','failed','refunded')),
    method                  VARCHAR(50),
    failure_reason          TEXT,
    refund_id               VARCHAR(100),
    refund_amount           NUMERIC(10,2),
    paid_at                 TIMESTAMPTZ,
    metadata                JSONB,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id    ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status     ON payments(status);

-- ─── Transport Bookings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transport_bookings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id           UUID         REFERENCES users(id),
    booking_id          UUID         REFERENCES bookings(id),   -- optional: linked stay booking
    vehicle_type        VARCHAR(50)  NOT NULL DEFAULT 'car'
                        CHECK (vehicle_type IN ('car','suv','van','bus','bike','auto')),
    pickup_address      VARCHAR(300) NOT NULL,
    pickup_lat          NUMERIC(10,7),
    pickup_lng          NUMERIC(10,7),
    dropoff_address     VARCHAR(300) NOT NULL,
    dropoff_lat         NUMERIC(10,7),
    dropoff_lng         NUMERIC(10,7),
    distance_km         NUMERIC(8,2),
    estimated_minutes   INTEGER,
    fare                NUMERIC(10,2),
    currency            VARCHAR(3)   NOT NULL DEFAULT 'INR',
    status              VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','in_progress','completed','cancelled')),
    pickup_time         TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transport_user_id   ON transport_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_transport_driver_id ON transport_bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_transport_status    ON transport_bookings(status);

-- ─── Tour Packages ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_packages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT         NOT NULL,
    destination     VARCHAR(200) NOT NULL,
    duration_days   INTEGER      NOT NULL CHECK (duration_days >= 1),
    price_per_person NUMERIC(10,2) NOT NULL,
    max_persons     INTEGER      NOT NULL DEFAULT 10,
    includes_stay   BOOLEAN      NOT NULL DEFAULT TRUE,
    includes_transport BOOLEAN   NOT NULL DEFAULT TRUE,
    includes_activities BOOLEAN  NOT NULL DEFAULT FALSE,
    activities      JSONB        DEFAULT '[]',
    itinerary_days  JSONB        DEFAULT '[]',
    images          JSONB        DEFAULT '[]',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_agent_id    ON tour_packages(agent_id);
CREATE INDEX IF NOT EXISTS idx_packages_destination ON tour_packages(destination);
CREATE INDEX IF NOT EXISTS idx_packages_active      ON tour_packages(is_active);

-- ─── Package Bookings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS package_bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id      UUID         NOT NULL REFERENCES tour_packages(id),
    persons         INTEGER      NOT NULL DEFAULT 1 CHECK (persons >= 1),
    total_amount    NUMERIC(10,2) NOT NULL,
    travel_date     DATE         NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','cancelled','completed')),
    special_requests TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pkg_bookings_user_id    ON package_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_pkg_bookings_package_id ON package_bookings(package_id);

-- ─── Auto-update updated_at trigger ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_transport_updated_at
    BEFORE UPDATE ON transport_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_packages_updated_at
    BEFORE UPDATE ON tour_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_pkg_bookings_updated_at
    BEFORE UPDATE ON package_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Sample admin user (password: Admin@1234) ─────────────────────────────────
-- bcrypt hash of 'Admin@1234' with salt rounds 12
INSERT INTO users (first_name, last_name, email, password, role, is_verified)
VALUES (
    'Admin', 'User',
    'admin@travelsuperapp.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i',
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;
