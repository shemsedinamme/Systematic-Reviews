// user.model.js
class User {
    constructor({
        user_id,
        username,
        email,
        hashed_password,
        registration_date,
        role,
        subscriptionOption,
         studentId
    } = {}) {
        this.user_id = user_id || null;
        this.username = username || null;
        this.email = email || null;
        this.hashed_password = hashed_password || null;
        this.registration_date = registration_date || null;
        this.role = role || 'reviewer'; // Default role is 'reviewer'
        this.subscriptionOption = subscriptionOption || null;
        this.studentId = studentId || null;

    }
    toJSON() {
        return {
            user_id: this.user_id,
            username: this.username,
            email: this.email,
             role: this.role,
             subscriptionOption: this.subscriptionOption,
             studentId: this.studentId,
            registration_date: this.registration_date, // Include only if needed in response
        };
    }
}

module.exports = User;