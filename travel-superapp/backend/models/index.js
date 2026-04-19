/**
 * Model associations and exports
 * Import this file once in server.js to register all models
 */

const User = require('./User');
const Booking = require('./Booking');
const Payment = require('./Payment');
const TransportBooking = require('./TransportBooking');
const TourPackage = require('./TourPackage');
const PackageBooking = require('./PackageBooking');

// ─── Associations ─────────────────────────────────────────────────────────────

// User → Bookings (one-to-many)
User.hasMany(Booking, { foreignKey: 'userId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User → Payments (one-to-many)
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Booking → Payment (one-to-one)
Booking.hasOne(Payment, { foreignKey: 'bookingId', as: 'payment' });
Payment.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

// User (traveler) → TransportBookings
User.hasMany(TransportBooking, { foreignKey: 'userId', as: 'transportBookings' });
TransportBooking.belongsTo(User, { foreignKey: 'userId', as: 'traveler' });

// User (driver) → Assigned TransportBookings
User.hasMany(TransportBooking, { foreignKey: 'driverId', as: 'assignedTrips' });
TransportBooking.belongsTo(User, { foreignKey: 'driverId', as: 'driver' });

// Booking → TransportBooking (optional link)
Booking.hasOne(TransportBooking, { foreignKey: 'bookingId', as: 'transport' });
TransportBooking.belongsTo(Booking, { foreignKey: 'bookingId', as: 'stayBooking' });

// User (agent) → TourPackages
User.hasMany(TourPackage, { foreignKey: 'agentId', as: 'packages' });
TourPackage.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });

// User → PackageBookings
User.hasMany(PackageBooking, { foreignKey: 'userId', as: 'packageBookings' });
PackageBooking.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// TourPackage → PackageBookings
TourPackage.hasMany(PackageBooking, { foreignKey: 'packageId', as: 'bookings' });
PackageBooking.belongsTo(TourPackage, { foreignKey: 'packageId', as: 'package' });

module.exports = { User, Booking, Payment, TransportBooking, TourPackage, PackageBooking };
