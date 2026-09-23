DROP TABLE IF EXISTS auth_tokens;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS parent_students;
DROP TABLE IF EXISTS tutor_students;
DROP TABLE IF EXISTS managers;
DROP TABLE IF EXISTS parents;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS tutors;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform_user_id CHAR(8) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone_number VARCHAR(30) NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('tutor', 'student', 'parent', 'manager') NOT NULL,
    account_status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE tutors (
    user_id INT PRIMARY KEY,
    bio TEXT NULL,
    specialism VARCHAR(150) NULL,
    stages_taught JSON NULL,
    subjects_taught JSON NULL,
    exam_boards_taught JSON NULL,
    manager_user_id INT NULL,
    approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    approval_notes TEXT NULL,
    approved_by_user_id INT NULL,
    approved_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tutors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tutors_manager FOREIGN KEY (manager_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tutors_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE students (
    user_id INT PRIMARY KEY,
    year_group VARCHAR(50) NULL,
    target_grade VARCHAR(50) NULL,
    subject_focus VARCHAR(150) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE parents (
    user_id INT PRIMARY KEY,
    phone VARCHAR(30) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_parents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE managers (
    user_id INT PRIMARY KEY,
    title VARCHAR(80) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_managers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tutor_students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tutor_user_id INT NOT NULL,
    student_user_id INT NOT NULL,
    assigned_by_user_id INT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tutor_student (tutor_user_id, student_user_id),
    CONSTRAINT fk_tutor_students_tutor FOREIGN KEY (tutor_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tutor_students_student FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tutor_students_assigned_by FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE parent_students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_user_id INT NOT NULL,
    student_user_id INT NOT NULL,
    relationship_label VARCHAR(50) NULL,
    assigned_by_user_id INT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_parent_student (parent_user_id, student_user_id),
    CONSTRAINT fk_parent_students_parent FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_parent_students_student FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_parent_students_assigned_by FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requested_by_user_id INT NOT NULL,
    tutor_user_id INT NOT NULL,
    student_user_id INT NOT NULL,
    parent_user_id INT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INT NOT NULL,
    subject VARCHAR(150) NOT NULL,
    exam_board VARCHAR(80) NOT NULL DEFAULT 'General',
    notes TEXT NULL,
    attendance_status ENUM('not_present', 'present', 'late', 'cancelled') NOT NULL DEFAULT 'not_present',
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
    decision_notes TEXT NULL,
    approved_by_user_id INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_requested_by FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_tutor FOREIGN KEY (tutor_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_student FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_parent FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_bookings_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tutor_user_id INT NOT NULL,
    student_user_id INT NOT NULL,
    booking_id INT NULL,
    topic VARCHAR(150) NOT NULL,
    exam_board VARCHAR(80) NOT NULL DEFAULT 'General',
    session_date DATETIME NOT NULL,
    duration_minutes INT NOT NULL,
    notes TEXT NULL,
    attendance_status ENUM('not_present', 'present', 'late', 'cancelled') NOT NULL DEFAULT 'not_present',
    homework_set TEXT NULL,
    next_steps TEXT NULL,
    assessment_note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sessions_tutor FOREIGN KEY (tutor_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_student FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

CREATE TABLE conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject VARCHAR(150) NOT NULL,
    participant_one_user_id INT NOT NULL,
    participant_two_user_id INT NOT NULL,
    student_user_id INT NULL,
    created_by_user_id INT NOT NULL,
    last_message_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversations_user_one FOREIGN KEY (participant_one_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversations_user_two FOREIGN KEY (participant_two_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversations_student FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_conversations_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_user_id INT NOT NULL,
    recipient_user_id INT NOT NULL,
    body TEXT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_recipient FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_bookings_tutor_date ON bookings(tutor_user_id, booking_date, start_time);
CREATE INDEX idx_bookings_student_date ON bookings(student_user_id, booking_date, start_time);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_sessions_tutor_date ON sessions(tutor_user_id, session_date DESC);
CREATE INDEX idx_sessions_student_date ON sessions(student_user_id, session_date DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
