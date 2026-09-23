START TRANSACTION;

SET @seed_password_hash = '$2b$10$kw8VvEp1gwWvEwsAnS4tXu3IOEs8PaYzm5cP8kQKwiStch4joKeym';

INSERT INTO users (id, platform_user_id, full_name, email, phone_number, password_hash, role) VALUES
    (1, '12000001', 'Maya Evans', 'manager@tutortrack.local', '07000 100001', @seed_password_hash, 'manager'),
    (2, '12000002', 'Aisha Khan', 'tutor.aisha@tutortrack.local', '07000 100002', @seed_password_hash, 'tutor'),
    (3, '12000003', 'Daniel Roberts', 'tutor.daniel@tutortrack.local', '07000 100003', @seed_password_hash, 'tutor'),
    (4, '12000004', 'Sophie Patel', 'tutor.sophie@tutortrack.local', '07000 100004', @seed_password_hash, 'tutor'),
    (5, '12000005', 'Tom Hughes', 'tutor.tom@tutortrack.local', '07000 100005', @seed_password_hash, 'tutor'),
    (6, '12000006', 'Sana Ali', 'parent.sana@tutortrack.local', '07111 222333', @seed_password_hash, 'parent'),
    (7, '12000007', 'Michael Carter', 'parent.michael@tutortrack.local', '07222 333444', @seed_password_hash, 'parent'),
    (8, '12000008', 'Rachel Green', 'parent.rachel@tutortrack.local', '07333 444555', @seed_password_hash, 'parent'),
    (9, '12000009', 'Amira Ali', 'student.amira@tutortrack.local', NULL, @seed_password_hash, 'student'),
    (10, '12000010', 'Yusuf Ali', 'student.yusuf@tutortrack.local', NULL, @seed_password_hash, 'student'),
    (11, '12000011', 'Mariam Ali', 'student.mariam@tutortrack.local', NULL, @seed_password_hash, 'student'),
    (12, '12000012', 'Hana Ali', 'student.hana@tutortrack.local', NULL, @seed_password_hash, 'student'),
    (13, '12000013', 'Noah Carter', 'student.noah@tutortrack.local', NULL, @seed_password_hash, 'student'),
    (14, '12000014', 'Leah Brown', 'student.leah@tutortrack.local', NULL, @seed_password_hash, 'student');

INSERT INTO managers (user_id, title) VALUES (1, 'Centre Manager');

INSERT INTO tutors (
    user_id,
    bio,
    specialism,
    stages_taught,
    subjects_taught,
    exam_boards_taught,
    manager_user_id,
    approval_status,
    approval_notes,
    approved_by_user_id,
    approved_at
) VALUES
    (
        2,
        'Evidence-led mathematics and science tutor focused on structured explanations and clear follow-up tasks.',
        'Mathematics and Science',
        JSON_ARRAY('Primary school', 'Secondary school', 'College / post-16'),
        JSON_ARRAY('Mathematics', 'Biology', 'Chemistry', 'Combined Science'),
        JSON_ARRAY('AQA', 'OCR', 'Pearson Edexcel'),
        1,
        'approved',
        'Approved for live tutoring and reporting.',
        1,
        '2026-04-01 09:00:00'
    ),
    (
        3,
        'Pending English tutor application focused on essay writing and reading comprehension.',
        'English',
        JSON_ARRAY('Secondary school', 'College / post-16'),
        JSON_ARRAY('English Language', 'English Literature', 'History'),
        JSON_ARRAY('AQA', 'OCR', 'WJEC Eduqas'),
        1,
        'pending',
        NULL,
        NULL,
        NULL
    ),
    (
        4,
        'Pending science tutor application with classroom and revision-centre experience.',
        'Science',
        JSON_ARRAY('Secondary school', 'College / post-16'),
        JSON_ARRAY('Biology', 'Chemistry', 'Physics', 'Combined Science'),
        JSON_ARRAY('AQA', 'OCR', 'Pearson Edexcel'),
        1,
        'pending',
        NULL,
        NULL,
        NULL
    ),
    (
        5,
        'Pending computing tutor application with a focus on exam preparation and coursework support.',
        'Computer Science',
        JSON_ARRAY('Secondary school', 'College / post-16'),
        JSON_ARRAY('Computer Science', 'Business'),
        JSON_ARRAY('OCR', 'Pearson Edexcel'),
        1,
        'pending',
        NULL,
        NULL,
        NULL
    );

INSERT INTO parents (user_id, phone, notes) VALUES
    (6, '07111 222333', 'Primary guardian linked to four children for dashboard testing.'),
    (7, '07222 333444', 'Primary guardian linked to one child for booking and messaging testing.'),
    (8, '07333 444555', 'Parent account with no linked children for empty-state testing.');

INSERT INTO students (user_id, year_group, target_grade, subject_focus, notes) VALUES
    (9, 'Year 10', 'Grade 8', 'Mathematics', 'Preparing for higher-tier GCSE algebra topics.'),
    (10, 'Year 8', 'Grade 6', 'Mathematics', 'Building confidence with fractions and percentages.'),
    (11, 'Year 12', 'Grade B', 'Biology', 'Needs structured recall and exam-question practice.'),
    (12, 'Year 5', 'Expected standard', 'Mathematics', 'Primary numeracy support with short focused sessions.'),
    (13, 'Year 11', 'Grade 7', 'Mathematics', 'Needs statistics and probability revision before mocks.'),
    (14, 'Year 9', 'Grade 6', 'Combined Science', 'Unassigned student kept available for assignment testing.');

INSERT INTO tutor_students (tutor_user_id, student_user_id, assigned_by_user_id) VALUES
    (2, 9, 1),
    (2, 10, 1),
    (2, 11, 1),
    (2, 12, 1),
    (2, 13, 1);

INSERT INTO parent_students (parent_user_id, student_user_id, relationship_label, assigned_by_user_id) VALUES
    (6, 9, 'Mother', 1),
    (6, 10, 'Mother', 1),
    (6, 11, 'Mother', 1),
    (6, 12, 'Mother', 1),
    (7, 13, 'Father', 1);

INSERT INTO bookings (
    id,
    requested_by_user_id,
    tutor_user_id,
    student_user_id,
    parent_user_id,
    booking_date,
    start_time,
    duration_minutes,
    subject,
    exam_board,
    notes,
    attendance_status,
    status,
    decision_notes,
    approved_by_user_id
) VALUES
    (1, 6, 2, 9, 6, '2026-04-24', '16:00:00', 60, 'Quadratic equations', 'AQA', 'Parent requested a revision-focused session before the next class test.', 'not_present', 'pending', NULL, NULL),
    (2, 13, 2, 13, 7, '2026-04-25', '18:00:00', 60, 'Statistics revision', 'Pearson Edexcel', 'Student requested extra support on averages and probability questions.', 'not_present', 'pending', NULL, NULL),
    (3, 6, 2, 10, 6, '2026-04-23', '17:00:00', 60, 'Fractions and percentages', 'General', 'Confirmed catch-up session for percentage change practice.', 'not_present', 'confirmed', 'Tutor accepted this upcoming session.', 2),
    (4, 6, 2, 11, 6, '2026-04-26', '10:00:00', 60, 'Cell biology recall', 'OCR', 'Confirmed revision slot for retrieval practice before college assessment.', 'not_present', 'confirmed', 'Tutor accepted this upcoming session.', 2),
    (5, 6, 2, 9, 6, '2026-04-14', '17:00:00', 60, 'Simultaneous equations', 'AQA', 'Past booking completed and reported.', 'present', 'completed', 'Session completed and report recorded.', 2),
    (6, 7, 2, 13, 7, '2026-04-13', '18:00:00', 60, 'Averages and probability', 'Pearson Edexcel', 'Past booking completed and reported.', 'late', 'completed', 'Session completed and report recorded.', 2),
    (7, 6, 2, 12, 6, '2026-04-15', '16:00:00', 45, 'Number bonds to 100', 'General', 'Completed session still waiting for a formal report.', 'present', 'completed', 'Completed booking awaiting tutor report.', 2),
    (8, 6, 2, 10, 6, '2026-04-27', '14:00:00', 60, 'Ratio basics', 'General', 'Cancelled after the family rearranged weekend plans.', 'cancelled', 'cancelled', 'Cancelled by parent before the session date.', 2);

INSERT INTO sessions (
    id,
    tutor_user_id,
    student_user_id,
    booking_id,
    topic,
    exam_board,
    session_date,
    duration_minutes,
    notes,
    attendance_status,
    homework_set,
    next_steps,
    assessment_note
) VALUES
    (1, 2, 9, 5, 'Simultaneous equations', 'AQA', '2026-04-14 17:00:00', 60, 'Worked through elimination and substitution with scaffolded GCSE questions.', 'present', 'Complete five mixed simultaneous equation questions.', 'Move into worded problems and reduce scaffolding.', '14 Apr 2026, 7/10 starter quiz, 70%, simultaneous equations, keep checking variable elimination.'),
    (2, 2, 13, 6, 'Averages and probability', 'Pearson Edexcel', '2026-04-13 18:00:00', 60, 'Reviewed mean, median, mode, then linked probability language to short exam questions.', 'late', 'Finish the probability worksheet and correct question 4.', 'Practise weighted averages and explain reasoning in full sentences.', '13 Apr 2026, 15/20, 75%, averages, next steps on probability reasoning.'),
    (3, 2, 10, NULL, 'Fractions and percentages', 'General', '2026-04-08 17:00:00', 60, 'Built confidence with fraction-to-percentage conversions using visual models.', 'present', 'Complete the conversion recap sheet.', 'Apply percentages to worded problems.', '8 Apr 2026, 12/15, 80%, fractions and percentages, next steps on multi-step percentage problems.'),
    (4, 2, 11, NULL, 'Cell biology recall', 'OCR', '2026-04-09 16:30:00', 60, 'Used retrieval flashcards and extended responses on cell structures.', 'present', 'Make six flashcards for organelles and functions.', 'Link cell structure to microscopy questions.', '9 Apr 2026, 11/16, 69%, cell biology, next steps on application questions.');

INSERT INTO conversations (
    id,
    subject,
    participant_one_user_id,
    participant_two_user_id,
    student_user_id,
    created_by_user_id,
    last_message_at,
    created_at
) VALUES
    (1, 'Amira maths update', 2, 6, 9, 2, '2026-04-14 18:10:00', '2026-04-14 17:55:00'),
    (2, 'Noah follow-up question', 2, 13, 13, 13, '2026-04-13 19:05:00', '2026-04-13 18:50:00'),
    (3, 'Tutor check-in', 1, 2, NULL, 1, '2026-04-16 09:35:00', '2026-04-16 09:00:00'),
    (4, 'Booking support for Noah', 1, 7, 13, 7, '2026-04-20 12:15:00', '2026-04-20 11:50:00');

INSERT INTO messages (conversation_id, sender_user_id, recipient_user_id, body, is_read, created_at) VALUES
    (1, 2, 6, 'Amira handled elimination much more confidently today. I have recorded the report and next steps.', 1, '2026-04-14 18:00:00'),
    (1, 6, 2, 'Thank you. We will finish the homework before the next session request.', 0, '2026-04-14 18:10:00'),
    (2, 13, 2, 'Could we revisit probability trees next time as well?', 1, '2026-04-13 18:58:00'),
    (2, 2, 13, 'Yes, I will include them in the next statistics session.', 0, '2026-04-13 19:05:00'),
    (3, 1, 2, 'Your assigned caseload is live. Please keep reports up to date for demonstration week.', 1, '2026-04-16 09:00:00'),
    (3, 2, 1, 'Understood. I have already cleared the existing past reports and upcoming requests.', 0, '2026-04-16 09:35:00'),
    (4, 7, 1, 'Can the next booking stay after 6pm because of football practice?', 1, '2026-04-20 11:50:00'),
    (4, 1, 7, 'Yes, that is fine. The tutor can confirm the 6pm slot once requested.', 0, '2026-04-20 12:15:00');

COMMIT;
