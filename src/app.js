const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authMiddleware = require("./middleware/authMiddleware");
require("dotenv").config();

const app = express();
app.use(cors());

app.use(express.json());
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({
            message: "Invalid JSON format"
        });
    }

    return next(err);
});

// ==================== HOME ====================

app.get("/", (req, res) => {
    res.json({
        message: "Job Portal API is running"
    });
});


// ==================== REGISTER ====================

app.post("/api/auth/register", async (req, res) => {
    const client = await db.connect();

    try {
        const { username, email, password, role } = req.body;

        // 1. Validate required fields
        if (!username || !email || !password || !role) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        if (!["JOB_SEEKER", "RECRUITER"].includes(role)) {
            return res.status(400).json({
                message: "Invalid role"
            });
        }

        // 2. Check duplicate username/email
        const existingUser = await db.query(
            "SELECT user_id FROM users WHERE email = $1 OR username = $2",
            [email, username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Username or email already exists"
            });
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        await client.query("BEGIN");

        // 4. Create user
        const userResult = await client.query(
            `INSERT INTO users (username, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING user_id, username, email, role`,
            [username, email, hashedPassword, role]
        );

        const user = userResult.rows[0];

        // 5. Create profile for job seekers
        if (role === "JOB_SEEKER") {
            await client.query(
                `INSERT INTO job_seeker_profiles
                    (user_id, first_name, last_name)
                 VALUES ($1, $2, $3)`,
                [user.user_id, username, null]
            );
        }

        await client.query("COMMIT");

        // 6. Send response
        return res.status(201).json({
            message: "User registered successfully",
            user
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Registration error:", error.message);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Username or email already exists"
            });
        }

        return res.status(500).json({
            message: "Internal server error"
        });

    } finally {
        client.release();
    }
});
// ==================== LOGIN ====================

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, username, password } = req.body;

        // 1. Accept either email or username
        const loginId = (email || username || "").trim();

        // 2. Check required fields
        if (!loginId || !password) {
            return res.status(400).json({
                message: "Email/username and password are required"
            });
        }

        // 3. Find user using email OR username
        const result = await db.query(
            `SELECT user_id, username, email, password_hash, role
             FROM users
             WHERE email = $1 OR username = $1`,
            [loginId]
        );

        // 4. User doesn't exist
        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email/username or password"
            });
        }

        const user = result.rows[0];

        // 5. Compare password
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password_hash
        );

        // 6. Wrong password
        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email/username or password"
            });
        }

        // 7. Generate JWT
        const token = jwt.sign(
            {
                user_id: user.user_id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        // 8. Send response
        return res.status(200).json({
            message: "Login successful",
            token: token,
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ==================== GET PROFILE ====================

app.get("/api/profile", authMiddleware, async (req, res) => {
    try {
        // 1. Get user information from JWT
        const userId = req.user.user_id;
        const role = req.user.role;

        // 2. Check whether user is a JOB_SEEKER
        if (role !== "JOB_SEEKER") {
            return res.status(403).json({
                message: "Only job seekers can access this profile"
            });
        }

        // 3. Check whether profile exists
        const result = await db.query(
            `SELECT *
             FROM job_seeker_profiles
             WHERE user_id = $1`,
            [userId]
        );

        // 4. Profile doesn't exist
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Job seeker profile not found"
            });
        }

        // 5. Return profile
        return res.status(200).json({
            message: "Profile fetched successfully",
            profile: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// ==================== UPDATE PROFILE ====================

app.put("/api/profile", authMiddleware, async (req, res) => {
    try {
        // 1. Get user information from JWT
        const userId = req.user.user_id;
        const role = req.user.role;

        // 2. Check whether user is a JOB_SEEKER
        if (role !== "JOB_SEEKER") {
            return res.status(403).json({
                message: "Only job seekers can update this profile"
            });
        }

        // 3. Check whether profile exists
        const existingProfile = await db.query(
            `SELECT profile_id
             FROM job_seeker_profiles
             WHERE user_id = $1`,
            [userId]
        );

        if (existingProfile.rows.length === 0) {
            return res.status(404).json({
                message: "Job seeker profile not found"
            });
        }

        // 4. Get updated data
        const {
            first_name,
            last_name,
            address,
            graduation,
            bio,
            experience_years,
            resume_url,
            linkedin_url,
            github_url
        } = req.body;

        // 5. Validate required field
        if (!first_name) {
            return res.status(400).json({
                message: "First name is required"
            });
        }

        // 6. Update profile
        const result = await db.query(
            `UPDATE job_seeker_profiles
             SET
                first_name = $1,
                last_name = $2,
                address = $3,
                graduation = $4,
                bio = $5,
                experience_years = $6,
                resume_url = $7,
                linkedin_url = $8,
                github_url = $9,
                updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $10
             RETURNING *`,
            [
                first_name,
                last_name,
                address,
                graduation,
                bio,
                experience_years ?? 0,
                resume_url,
                linkedin_url,
                github_url,
                userId
            ]
        );

        // 7. Send updated profile
        return res.status(200).json({
            message: "Profile updated successfully",
            profile: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// ==================== SKILLS ====================

// ADD SKILL
app.post("/api/profile/skills", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;

        if (role !== "JOB_SEEKER") {
            return res.status(403).json({
                message: "Only job seekers can add skills"
            });
        }

        const { skill_name } = req.body;

        if (!skill_name || !skill_name.trim()) {
            return res.status(400).json({
                message: "Skill name is required"
            });
        }

        // Check whether skill already exists
        let skillResult = await db.query(
            `SELECT skill_id, skill_name
             FROM skills
             WHERE LOWER(skill_name) = LOWER($1)`,
            [skill_name.trim()]
        );

        let skill;

        // If skill doesn't exist, create it
        if (skillResult.rows.length === 0) {
            skillResult = await db.query(
                `INSERT INTO skills (skill_name)
                 VALUES ($1)
                 RETURNING skill_id, skill_name`,
                [skill_name.trim()]
            );

            skill = skillResult.rows[0];
        } else {
            skill = skillResult.rows[0];
        }

        // Check whether user already has this skill
        const existingSkill = await db.query(
            `SELECT user_id, skill_id
             FROM user_skills
             WHERE user_id = $1 AND skill_id = $2`,
            [userId, skill.skill_id]
        );

        if (existingSkill.rows.length > 0) {
            return res.status(409).json({
                message: "Skill already added to your profile"
            });
        }

        // Connect user with skill
        await db.query(
            `INSERT INTO user_skills (user_id, skill_id)
             VALUES ($1, $2)`,
            [userId, skill.skill_id]
        );

        return res.status(201).json({
            message: "Skill added successfully",
            skill: skill
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});


// GET MY SKILLS
app.get("/api/profile/skills", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;

        if (role !== "JOB_SEEKER") {
           return res.status(403).json({
           message: "Only job seekers can view skills"
           });
        }

        const result = await db.query(
            `SELECT
                s.skill_id,
                s.skill_name
             FROM user_skills us
             JOIN skills s
                ON us.skill_id = s.skill_id
             WHERE us.user_id = $1
             ORDER BY s.skill_name`,
            [userId]
        );

        return res.status(200).json({
            message: "Skills fetched successfully",
            skills: result.rows
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});


// UPDATE MY SKILL
app.put("/api/profile/skills/:skill_id", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;
        const oldSkillId = req.params.skill_id;

        if (role !== "JOB_SEEKER") {
            return res.status(403).json({
                message: "Only job seekers can update skills"
            });
        }

        const { skill_name } = req.body;

        if (!skill_name || !skill_name.trim()) {
            return res.status(400).json({
                message: "Skill name is required"
            });
        }

        // Check whether user has the old skill
        const existingSkill = await db.query(
            `SELECT skill_id
             FROM user_skills
             WHERE user_id = $1 AND skill_id = $2`,
            [userId, oldSkillId]
        );

        if (existingSkill.rows.length === 0) {
            return res.status(404).json({
                message: "Skill not found in your profile"
            });
        }

        // Find the new skill
        let newSkillResult = await db.query(
            `SELECT skill_id, skill_name
             FROM skills
             WHERE LOWER(skill_name) = LOWER($1)`,
            [skill_name.trim()]
        );

        let newSkill;

        // Create new skill if it doesn't exist
        if (newSkillResult.rows.length === 0) {
            newSkillResult = await db.query(
                `INSERT INTO skills (skill_name)
                 VALUES ($1)
                 RETURNING skill_id, skill_name`,
                [skill_name.trim()]
            );

            newSkill = newSkillResult.rows[0];
        } else {
            newSkill = newSkillResult.rows[0];
        }

        // Check if user already has the new skill
        const duplicateSkill = await db.query(
            `SELECT skill_id
             FROM user_skills
             WHERE user_id = $1 AND skill_id = $2`,
            [userId, newSkill.skill_id]
        );

        if (duplicateSkill.rows.length > 0) {
            return res.status(409).json({
                message: "You already have this skill"
            });
        }

        // Replace old skill with new skill
        await db.query(
            `UPDATE user_skills
             SET skill_id = $1
             WHERE user_id = $2 AND skill_id = $3`,
            [newSkill.skill_id, userId, oldSkillId]
        );

        return res.status(200).json({
            message: "Skill updated successfully",
            skill: newSkill
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});


// REMOVE SKILL
app.delete("/api/profile/skills/:skill_id", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;
        const skillId = req.params.skill_id;

        if (role !== "JOB_SEEKER") {
            return res.status(403).json({
                message: "Only job seekers can remove skills"
            });
        }

        const result = await db.query(
            `DELETE FROM user_skills
             WHERE user_id = $1 AND skill_id = $2
             RETURNING skill_id`,
            [userId, skillId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Skill not found in your profile"
            });
        }

        return res.status(200).json({
            message: "Skill removed successfully"
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// ==================== COMPANY ====================

// CREATE COMPANY
app.post("/api/companies", authMiddleware, async (req, res) => {
    try {
        
        const role = req.user.role;

        if (role !== "RECRUITER") {
            return res.status(403).json({
                message: "Only recruiters can create a company"
            });
        }

        const {
            company_name,
            description,
            website,
            location,
            logo_url
        } = req.body;

        if (!company_name || !company_name.trim()) {
            return res.status(400).json({
                message: "Company name is required"
            });
        }

        const result = await db.query(
            `INSERT INTO companies
                (company_name, description, website, location, logo_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING
                company_id,
                company_name,
                description,
                website,
                location,
                logo_url`,
            [
                company_name.trim(),
                description || null,
                website || null,
                location || null,
                logo_url || null
            ]
        );

        return res.status(201).json({
            message: "Company created successfully",
            company: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// CREATE RECRUITER PROFILE
app.post("/api/recruiter/profile", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;

        if (role !== "RECRUITER") {
            return res.status(403).json({
                message: "Only recruiters can create recruiter profile"
            });
        }

        const { first_name, last_name, company_id } = req.body;

        if (!first_name || !first_name.trim()) {
            return res.status(400).json({
                message: "First name is required"
            });
        }

        if (!company_id) {
            return res.status(400).json({
                message: "Company ID is required"
            });
        }

        // Check company exists
        const companyResult = await db.query(
            `SELECT company_id, company_name
             FROM companies
             WHERE company_id = $1`,
            [company_id]
        );

        if (companyResult.rows.length === 0) {
            return res.status(404).json({
                message: "Company not found"
            });
        }

        // Check recruiter profile already exists
        const existingProfile = await db.query(
            `SELECT profile_id
             FROM recruiter_profiles
             WHERE user_id = $1`,
            [userId]
        );

        if (existingProfile.rows.length > 0) {
            return res.status(409).json({
                message: "Recruiter profile already exists"
            });
        }

        const result = await db.query(
            `INSERT INTO recruiter_profiles
                (user_id, first_name, last_name, company_id)
             VALUES ($1, $2, $3, $4)
             RETURNING
                profile_id,
                user_id,
                first_name,
                last_name,
                company_id`,
            [
                userId,
                first_name.trim(),
                last_name || null,
                company_id
            ]
        );

        return res.status(201).json({
            message: "Recruiter profile created successfully",
            profile: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// ==================== JOBS ====================

// CREATE JOB
app.post("/api/jobs", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;

        // Only recruiters can create jobs
        if (role !== "RECRUITER") {
            return res.status(403).json({
                message: "Only recruiters can create jobs"
            });
        }

        const {
            job_title,
            description,
            location,
            salary_min,
            salary_max,
            experience_min,
            experience_max,
            employment_type
        } = req.body;

        // =========================
        // Required fields
        // =========================

        if (!job_title || !job_title.trim()) {
            return res.status(400).json({
                message: "Job title is required"
            });
        }

        if (!description || !description.trim()) {
            return res.status(400).json({
                message: "Job description is required"
            });
        }

        // =========================
        // Location validation
        // =========================

        if (
            location !== undefined &&
            location !== null &&
            typeof location !== "string"
        ) {
            return res.status(400).json({
                message: "Location must be a string"
            });
        }

        if (
            location !== undefined &&
            location !== null &&
            !location.trim()
        ) {
            return res.status(400).json({
                message: "Location cannot be empty"
            });
        }

        // =========================
        // Employment type validation
        // =========================

        if (!employment_type) {
            return res.status(400).json({
                message: "Employment type is required"
            });
        }

        const allowedEmploymentTypes = [
            "FULL_TIME",
            "PART_TIME",
            "INTERNSHIP",
            "CONTRACT"
        ];

        if (!allowedEmploymentTypes.includes(employment_type)) {
            return res.status(400).json({
                message: "Invalid employment type"
            });
        }

        // =========================
        // Salary type validation
        // =========================

        if (
            salary_min !== undefined &&
            salary_min !== null &&
            (
                typeof salary_min !== "number" ||
                !Number.isFinite(salary_min)
            )
        ) {
            return res.status(400).json({
                message: "Minimum salary must be a valid number"
            });
        }

        if (
            salary_max !== undefined &&
            salary_max !== null &&
            (
                typeof salary_max !== "number" ||
                !Number.isFinite(salary_max)
            )
        ) {
            return res.status(400).json({
                message: "Maximum salary must be a valid number"
            });
        }

        // =========================
        // Negative salary validation
        // =========================

        if (
            salary_min !== undefined &&
            salary_min !== null &&
            salary_min < 0
        ) {
            return res.status(400).json({
                message: "Minimum salary cannot be negative"
            });
        }

        if (
            salary_max !== undefined &&
            salary_max !== null &&
            salary_max < 0
        ) {
            return res.status(400).json({
                message: "Maximum salary cannot be negative"
            });
        }

        // =========================
        // Salary range validation
        // =========================

        if (
            salary_min !== undefined &&
            salary_min !== null &&
            salary_max !== undefined &&
            salary_max !== null &&
            salary_max < salary_min
        ) {
            return res.status(400).json({
                message: "Maximum salary cannot be less than minimum salary"
            });
        }

        // =========================
        // Experience type validation
        // Experience must be an integer
        // =========================

        if (
            experience_min !== undefined &&
            experience_min !== null &&
            (
                typeof experience_min !== "number" ||
                !Number.isInteger(experience_min) ||
                !Number.isSafeInteger(experience_min)
            )
        ) {
            return res.status(400).json({
                message: "Minimum experience must be a valid integer"
            });
        }

        if (
            experience_max !== undefined &&
            experience_max !== null &&
            (
                typeof experience_max !== "number" ||
                !Number.isInteger(experience_max) ||
                !Number.isSafeInteger(experience_max)
            )
        ) {
            return res.status(400).json({
                message: "Maximum experience must be a valid integer"
            });
        }

        // =========================
        // Negative experience validation
        // =========================

        if (
            experience_min !== undefined &&
            experience_min !== null &&
            experience_min < 0
        ) {
            return res.status(400).json({
                message: "Minimum experience cannot be negative"
            });
        }

        if (
            experience_max !== undefined &&
            experience_max !== null &&
            experience_max < 0
        ) {
            return res.status(400).json({
                message: "Maximum experience cannot be negative"
            });
        }

        // =========================
        // Experience range validation
        // =========================

        if (
            experience_min !== undefined &&
            experience_min !== null &&
            experience_max !== undefined &&
            experience_max !== null &&
            experience_max < experience_min
        ) {
            return res.status(400).json({
                message: "Maximum experience cannot be less than minimum experience"
            });
        }

        // =========================
        // Find recruiter profile
        // =========================

        const recruiterResult = await db.query(
            `SELECT profile_id, company_id
             FROM recruiter_profiles
             WHERE user_id = $1`,
            [userId]
        );

        if (recruiterResult.rows.length === 0) {
            return res.status(404).json({
                message: "Recruiter profile not found"
            });
        }

        const recruiterProfile = recruiterResult.rows[0];

        // =========================
        // Create job
        // =========================

        const result = await db.query(
            `INSERT INTO jobs
                (
                    company_id,
                    recruiter_profile_id,
                    job_title,
                    description,
                    location,
                    salary_min,
                    salary_max,
                    experience_min,
                    experience_max,
                    employment_type
                )
             VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING
                job_id,
                company_id,
                recruiter_profile_id,
                job_title,
                description,
                location,
                salary_min,
                salary_max,
                experience_min,
                experience_max,
                employment_type,
                job_status,
                created_at`,
            [
                recruiterProfile.company_id,
                recruiterProfile.profile_id,
                job_title.trim(),
                description.trim(),
                location ? location.trim() : null,
                salary_min ?? null,
                salary_max ?? null,
                experience_min ?? 0,
                experience_max ?? null,
                employment_type
            ]
        );

        return res.status(201).json({
            message: "Job created successfully",
            job: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// GET MY JOBS
app.get("/api/jobs/my", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;

        if (role !== "RECRUITER") {
            return res.status(403).json({
                message: "Only recruiters can view their jobs"
            });
        }

        const result = await db.query(
            `SELECT
                j.job_id,
                j.job_title,
                j.description,
                j.location,
                j.salary_min,
                j.salary_max,
                j.experience_min,
                j.experience_max,
                j.employment_type,
                j.job_status,
                j.created_at,
                c.company_name
             FROM jobs j
             JOIN recruiter_profiles rp
                ON j.recruiter_profile_id = rp.profile_id
             JOIN companies c
                ON j.company_id = c.company_id
             WHERE rp.user_id = $1
             ORDER BY j.created_at DESC`,
            [userId]
        );

        return res.status(200).json({
            message: "Jobs fetched successfully",
            jobs: result.rows
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// UPDATE MY JOB
app.put("/api/jobs/:job_id", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;
        const jobId = req.params.job_id;

        // =========================
        // Role validation
        // =========================

        if (role !== "RECRUITER") {
            return res.status(403).json({
                message: "Only recruiters can update jobs"
            });
        }

        // =========================
        // Job ID validation
        // =========================

        if (!/^\d+$/.test(jobId) || Number(jobId) <= 0) {
            return res.status(400).json({
                message: "Invalid job ID"
            });
        }

        const {
            job_title,
            description,
            location,
            salary_min,
            salary_max,
            experience_min,
            experience_max,
            employment_type
        } = req.body;

        // =========================
        // Required fields
        // =========================

        if (!job_title || typeof job_title !== "string" || !job_title.trim()) {
            return res.status(400).json({
                message: "Job title is required"
            });
        }

        if (
            !description ||
            typeof description !== "string" ||
            !description.trim()
        ) {
            return res.status(400).json({
                message: "Job description is required"
            });
        }

        // =========================
        // Location validation
        // =========================

        if (
            location !== undefined &&
            location !== null &&
            typeof location !== "string"
        ) {
            return res.status(400).json({
                message: "Location must be a string"
            });
        }

        if (
            location !== undefined &&
            location !== null &&
            !location.trim()
        ) {
            return res.status(400).json({
                message: "Location cannot be empty"
            });
        }

        // =========================
        // Employment type validation
        // =========================

        if (!employment_type) {
            return res.status(400).json({
                message: "Employment type is required"
            });
        }

        const allowedEmploymentTypes = [
            "FULL_TIME",
            "PART_TIME",
            "INTERNSHIP",
            "CONTRACT"
        ];

        if (!allowedEmploymentTypes.includes(employment_type)) {
            return res.status(400).json({
                message: "Invalid employment type"
            });
        }

        // =========================
        // Salary type validation
        // =========================

        if (
            salary_min !== undefined &&
            salary_min !== null &&
            (
                typeof salary_min !== "number" ||
                !Number.isFinite(salary_min)
            )
        ) {
            return res.status(400).json({
                message: "Minimum salary must be a valid number"
            });
        }

        if (
            salary_max !== undefined &&
            salary_max !== null &&
            (
                typeof salary_max !== "number" ||
                !Number.isFinite(salary_max)
            )
        ) {
            return res.status(400).json({
                message: "Maximum salary must be a valid number"
            });
        }

        // =========================
        // Negative salary validation
        // =========================

        if (
            salary_min !== undefined &&
            salary_min !== null &&
            salary_min < 0
        ) {
            return res.status(400).json({
                message: "Minimum salary cannot be negative"
            });
        }

        if (
            salary_max !== undefined &&
            salary_max !== null &&
            salary_max < 0
        ) {
            return res.status(400).json({
                message: "Maximum salary cannot be negative"
            });
        }

        // =========================
        // Salary range validation
        // =========================

        if (
            salary_min !== undefined &&
            salary_min !== null &&
            salary_max !== undefined &&
            salary_max !== null &&
            salary_max < salary_min
        ) {
            return res.status(400).json({
                message: "Maximum salary cannot be less than minimum salary"
            });
        }

        // =========================
        // Experience type validation
        // =========================

        if (
            experience_min !== undefined &&
            experience_min !== null &&
            (
                typeof experience_min !== "number" ||
                !Number.isInteger(experience_min) ||
                !Number.isSafeInteger(experience_min)
            )
        ) {
            return res.status(400).json({
                message: "Minimum experience must be a valid integer"
            });
        }

        if (
            experience_max !== undefined &&
            experience_max !== null &&
            (
                typeof experience_max !== "number" ||
                !Number.isInteger(experience_max) ||
                !Number.isSafeInteger(experience_max)
            )
        ) {
            return res.status(400).json({
                message: "Maximum experience must be a valid integer"
            });
        }

        // =========================
        // Negative experience validation
        // =========================

        if (
            experience_min !== undefined &&
            experience_min !== null &&
            experience_min < 0
        ) {
            return res.status(400).json({
                message: "Minimum experience cannot be negative"
            });
        }

        if (
            experience_max !== undefined &&
            experience_max !== null &&
            experience_max < 0
        ) {
            return res.status(400).json({
                message: "Maximum experience cannot be negative"
            });
        }

        // =========================
        // Experience range validation
        // =========================

        if (
            experience_min !== undefined &&
            experience_min !== null &&
            experience_max !== undefined &&
            experience_max !== null &&
            experience_max < experience_min
        ) {
            return res.status(400).json({
                message: "Maximum experience cannot be less than minimum experience"
            });
        }

        // =========================
        // Find recruiter profile
        // =========================

        const recruiterResult = await db.query(
            `SELECT profile_id
             FROM recruiter_profiles
             WHERE user_id = $1`,
            [userId]
        );

        if (recruiterResult.rows.length === 0) {
            return res.status(404).json({
                message: "Recruiter profile not found"
            });
        }

        const recruiterProfileId = recruiterResult.rows[0].profile_id;

        // =========================
        // Update job
        // =========================

        const result = await db.query(
            `UPDATE jobs
             SET
                job_title = $1,
                description = $2,
                location = $3,
                salary_min = $4,
                salary_max = $5,
                experience_min = $6,
                experience_max = $7,
                employment_type = $8,
                updated_at = CURRENT_TIMESTAMP
             WHERE job_id = $9
               AND recruiter_profile_id = $10
             RETURNING
                job_id,
                company_id,
                recruiter_profile_id,
                job_title,
                description,
                location,
                salary_min,
                salary_max,
                experience_min,
                experience_max,
                employment_type,
                job_status,
                updated_at`,
            [
                job_title.trim(),
                description.trim(),
                location ? location.trim() : null,
                salary_min ?? null,
                salary_max ?? null,
                experience_min ?? 0,
                experience_max ?? null,
                employment_type,
                Number(jobId),
                recruiterProfileId
            ]
        );

        // =========================
        // Job not found / ownership
        // =========================

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Job not found or you do not own this job"
            });
        }

        return res.status(200).json({
            message: "Job updated successfully",
            job: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// UPDATE JOB STATUS
app.patch("/api/jobs/:job_id/status", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;
        const jobId = req.params.job_id;

        // =========================
        // Role validation
        // =========================

        if (role !== "RECRUITER") {
            return res.status(403).json({
                message: "Only recruiters can update job status"
            });
        }

        // =========================
        // Job ID validation
        // =========================

        const parsedJobId = Number(jobId);

        if (
            !/^\d+$/.test(jobId) ||
            !Number.isSafeInteger(parsedJobId) ||
            parsedJobId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid job ID"
            });
        }

        // =========================
        // Get job status
        // =========================

        const { job_status } = req.body;

        // =========================
        // Job status validation
        // =========================

        const allowedStatuses = [
            "DRAFT",
            "ACTIVE",
            "CLOSED"
        ];

        if (
            typeof job_status !== "string" ||
            !allowedStatuses.includes(job_status)
        ) {
            return res.status(400).json({
                message: "Invalid job status"
            });
        }

        // =========================
        // Find recruiter profile
        // =========================

        const recruiterResult = await db.query(
            `SELECT profile_id
             FROM recruiter_profiles
             WHERE user_id = $1`,
            [userId]
        );

        if (recruiterResult.rows.length === 0) {
            return res.status(404).json({
                message: "Recruiter profile not found"
            });
        }

        const recruiterProfileId = recruiterResult.rows[0].profile_id;

        // =========================
        // Update recruiter's own job
        // =========================

        const result = await db.query(
            `UPDATE jobs
             SET
                job_status = $1,
                updated_at = CURRENT_TIMESTAMP
             WHERE job_id = $2
               AND recruiter_profile_id = $3
             RETURNING
                job_id,
                job_title,
                job_status,
                updated_at`,
            [
                job_status,
                parsedJobId,
                recruiterProfileId
            ]
        );

        // =========================
        // Job not found / ownership
        // =========================

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Job not found or you do not own this job"
            });
        }

        return res.status(200).json({
            message: "Job status updated successfully",
            job: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// GET ACTIVE JOBS
app.get("/api/jobs", async (req, res) => {
    try {
        const {
            location,
            employment_type,
            salary_min,
            experience_min,
            job_title,
            page,
            limit,
            sort
        } = req.query;

        // Pagination
        const currentPage = page === undefined ? 1 : Number(page);

        if (!Number.isInteger(currentPage) || currentPage < 1) {
            return res.status(400).json({
                message: "Page must be a valid integer greater than or equal to 1"
            });
        }

        const itemsPerPage = limit === undefined ? 10 : Number(limit);

        if (
            !Number.isInteger(itemsPerPage) ||
            itemsPerPage < 1 ||
            itemsPerPage > 50
        ) {
            return res.status(400).json({
                message: "Limit must be a valid integer between 1 and 50"
            });
        }

        const offset = (currentPage - 1) * itemsPerPage;

        // Sorting
        let orderBy = "j.created_at DESC";

        if (sort === "salary_high") {
            orderBy = "j.salary_min DESC";
        } else if (sort === "salary_low") {
            orderBy = "j.salary_min ASC";
        } else if (sort === "oldest") {
            orderBy = "j.created_at ASC";
        } else if (sort === "newest") {
            orderBy = "j.created_at DESC";
        }

        // Fetch active jobs
        const result = await db.query(
            `SELECT
                j.job_id,
                j.job_title,
                j.description,
                j.location,
                j.salary_min,
                j.salary_max,
                j.experience_min,
                j.experience_max,
                j.employment_type,
                j.job_status,
                j.created_at,
                c.company_name,
                COUNT(*) OVER() AS total_jobs
             FROM jobs j
             JOIN companies c
                ON j.company_id = c.company_id
             WHERE j.job_status = 'ACTIVE'
              AND ($1::text IS NULL OR j.location ILIKE '%' || $1 || '%')
              AND ($2::text IS NULL OR j.employment_type = $2)
              AND ($3::numeric IS NULL OR j.salary_min >= $3)
              AND ($4::int IS NULL OR j.experience_min >= $4)
              AND ($5::text IS NULL OR j.job_title ILIKE '%' || $5 || '%')
             ORDER BY ${orderBy}
             LIMIT $6
             OFFSET $7`,
            [
                location,
                employment_type,
                salary_min,
                experience_min,
                job_title,
                itemsPerPage,
                offset
            ]
        );

        // Total jobs
        const totalJobs = result.rows.length > 0
            ? Number(result.rows[0].total_jobs)
            : 0;

        // Total pages
        const totalPages = Math.ceil(totalJobs / itemsPerPage);

        return res.status(200).json({
            message: "Active jobs fetched successfully",
            page: currentPage,
            limit: itemsPerPage,
            total_jobs: totalJobs,
            total_pages: totalPages,
            jobs: result.rows.map(({ total_jobs, ...job }) => job)
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// 1. GET MY SAVED JOBS
app.get("/api/jobs/saved", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;

        if (role !== "JOB_SEEKER") {
            return res.status(403).json({
                message: "Only job seekers can view saved jobs"
            });
        }

        const result = await db.query(
            `SELECT
                s.saved_job_id,
                s.job_id,
                s.saved_at,
                j.job_title,
                j.description,
                j.location,
                j.salary_min,
                j.salary_max,
                j.experience_min,
                j.experience_max,
                j.employment_type,
                j.job_status,
                c.company_name
             FROM saved_jobs s
             JOIN job_seeker_profiles p
                ON s.job_seeker_profile_id = p.profile_id
             JOIN jobs j
                ON s.job_id = j.job_id
             JOIN companies c
                ON j.company_id = c.company_id
             WHERE p.user_id = $1
             ORDER BY s.saved_at DESC`,
            [userId]
        );

        return res.status(200).json({
            message: "Saved jobs fetched successfully",
            saved_jobs: result.rows
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});

/* GET SINGLE ACTIVE JOB */
app.get("/api/jobs/:job_id", async (req, res) => {
    try {
        const jobId = req.params.job_id;

        // Job ID validation
        const parsedJobId = Number(jobId);

        if (
            !/^\d+$/.test(jobId) ||
            !Number.isSafeInteger(parsedJobId) ||
            parsedJobId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid job ID"
            });
        }

        // Fetch only ACTIVE jobs
        const result = await db.query(
            `SELECT
                j.job_id,
                j.job_title,
                j.description,
                j.location,
                j.salary_min,
                j.salary_max,
                j.experience_min,
                j.experience_max,
                j.employment_type,
                j.job_status,
                j.created_at,
                j.updated_at,
                c.company_id,
                c.company_name,
                c.description AS company_description,
                c.website,
                c.location AS company_location
             FROM jobs j
             JOIN companies c
                ON j.company_id = c.company_id
             WHERE j.job_id = $1
               AND j.job_status = 'ACTIVE'`,
            [parsedJobId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Active job not found"
            });
        }

        return res.status(200).json({
            message: "Job fetched successfully",
            job: result.rows[0]
        });

    } catch (error) {
        console.error("Get single job error:", error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});


/* APPLY FOR JOB */
app.post("/api/jobs/:job_id/apply", authMiddleware, async (req, res) => {
    let client;

    try {
        const userId = req.user.user_id;
        const role = req.user.role;
        const jobId = req.params.job_id;

        // Role validation
        if (role !== "JOB_SEEKER") {
            return res.status(403).json({
                message: "Only job seekers can apply for jobs"
            });
        }

        // Job ID validation
        const parsedJobId = Number(jobId);

        if (
            !/^\d+$/.test(jobId) ||
            !Number.isSafeInteger(parsedJobId) ||
            parsedJobId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid job ID"
            });
        }

        const { resume_url, cover_letter } = req.body;

        // Resume URL validation
        if (
            resume_url !== undefined &&
            resume_url !== null &&
            typeof resume_url !== "string"
        ) {
            return res.status(400).json({
                message: "Resume URL must be a string"
            });
        }

        if (
            resume_url !== undefined &&
            resume_url !== null &&
            !resume_url.trim()
        ) {
            return res.status(400).json({
                message: "Resume URL cannot be empty"
            });
        }

        // Cover letter validation
        if (
            cover_letter !== undefined &&
            cover_letter !== null &&
            typeof cover_letter !== "string"
        ) {
            return res.status(400).json({
                message: "Cover letter must be a string"
            });
        }

        if (
            cover_letter !== undefined &&
            cover_letter !== null &&
            !cover_letter.trim()
        ) {
            return res.status(400).json({
                message: "Cover letter cannot be empty"
            });
        }

        // Find job seeker profile
        const profileResult = await db.query(
            `SELECT profile_id, resume_url
             FROM job_seeker_profiles
             WHERE user_id = $1`,
            [userId]
        );

        if (profileResult.rows.length === 0) {
            return res.status(404).json({
                message: "Job seeker profile not found"
            });
        }

        const profile = profileResult.rows[0];

        // Check that the job exists and is ACTIVE
        const jobResult = await db.query(
            `SELECT
                j.job_id,
                rp.user_id AS recruiter_user_id
             FROM jobs j
             JOIN recruiter_profiles rp
                ON j.recruiter_profile_id = rp.profile_id
             WHERE j.job_id = $1
               AND j.job_status = 'ACTIVE'`,
            [parsedJobId]
        );

        if (jobResult.rows.length === 0) {
            return res.status(404).json({
                message: "Active job not found"
            });
        }

        const recruiterUserId = jobResult.rows[0].recruiter_user_id;

        // Prevent duplicate applications
        const existingApplication = await db.query(
            `SELECT application_id
             FROM applications
             WHERE job_id = $1
               AND job_seeker_profile_id = $2`,
            [parsedJobId, profile.profile_id]
        );

        if (existingApplication.rows.length > 0) {
            return res.status(409).json({
                message: "You have already applied for this job"
            });
        }

        // Select resume and cover letter
        const finalResumeUrl =
            resume_url !== undefined && resume_url !== null
                ? resume_url.trim()
                : profile.resume_url || null;

        const finalCoverLetter =
            cover_letter !== undefined && cover_letter !== null
                ? cover_letter.trim()
                : null;

        // Begin database transaction
        client = await db.connect();

        try {
            await client.query("BEGIN");

            // Create application
            const result = await client.query(
                `INSERT INTO applications
                    (
                        job_id,
                        job_seeker_profile_id,
                        resume_url,
                        cover_letter
                    )
                 VALUES ($1, $2, $3, $4)
                 RETURNING
                    application_id,
                    job_id,
                    job_seeker_profile_id,
                    resume_url,
                    cover_letter,
                    status,
                    applied_at`,
                [
                    parsedJobId,
                    profile.profile_id,
                    finalResumeUrl,
                    finalCoverLetter
                ]
            );

            // Notify recruiter
            await client.query(
                `INSERT INTO notifications
                    (user_id, type, title, message)
                 VALUES ($1, $2, $3, $4)`,
                [
                    recruiterUserId,
                    "NEW_APPLICATION",
                    "New job application",
                    "Someone has applied for your job"
                ]
            );

            await client.query("COMMIT");

            return res.status(201).json({
                message: "Job application submitted successfully",
                application: result.rows[0]
            });

        } catch (transactionError) {
            await client.query("ROLLBACK");
            throw transactionError;

        } finally {
            client.release();
            client = null;
        }

    } catch (error) {
        if (client) {
            client.release();
        }

        console.error("Apply for job error:", error.message);
          // Handle duplicate application error
    if (error.code === "23505") {
        return res.status(409).json({
            message: "You have already applied for this job"
        });
    }

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});

// GET MY APPLICATIONS
app.get("/api/applications/my", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;

        if (role !== "JOB_SEEKER") {
            return res.status(403).json({
                message: "Only job seekers can view their applications"
            });
        }

        const result = await db.query(
            `SELECT
                a.application_id,
                a.job_id,
                a.status,
                a.resume_url,
                a.cover_letter,
                a.applied_at,
                a.updated_at,
                j.job_title,
                j.location,
                j.employment_type,
                c.company_name
             FROM applications a
             JOIN job_seeker_profiles p
                ON a.job_seeker_profile_id = p.profile_id
             JOIN jobs j
                ON a.job_id = j.job_id
             JOIN companies c
                ON j.company_id = c.company_id
             WHERE p.user_id = $1
             ORDER BY a.applied_at DESC`,
            [userId]
        );

        return res.status(200).json({
            message: "Applications fetched successfully",
            applications: result.rows
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
app.get("/api/applications/:application_id", authMiddleware, async (req, res) => {
    console.log("API HIT");
    try {
        const userId = req.user.user_id;
        const applicationId = req.params.application_id;
        const role = req.user.role;

        if (role !== "JOB_SEEKER") {
            return res.status(403).json({
              message: "Only job seekers can view their application"
            });
        }

        const result = await db.query(
            `SELECT
                a.application_id,
                a.job_id,
                a.status,
                a.resume_url,
                a.cover_letter,
                a.applied_at,
                a.updated_at,

                j.job_title,
                j.description,
                j.location,
                j.salary_min,
                j.salary_max,
                j.experience_min,
                j.experience_max,
                j.employment_type,

                c.company_name

             FROM applications a

             JOIN job_seeker_profiles p
                ON a.job_seeker_profile_id = p.profile_id

             JOIN jobs j
                ON a.job_id = j.job_id

             JOIN companies c
                ON j.company_id = c.company_id

             WHERE a.application_id = $1
               AND p.user_id = $2`,
            [applicationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Application not found"
            });
        }

        return res.status(200).json({
            message: "Application fetched successfully",
            application: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
app.get("/api/recruiter/jobs/:job_id/applications", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;
        const jobId = req.params.job_id;

        // Only recruiters can access this API
        if (role !== "RECRUITER") {
            return res.status(403).json({
                message: "Only recruiters can view job applications"
            });
        }

        // Check whether this recruiter owns the job
        const jobCheck = await db.query(
            `SELECT j.job_id
             FROM jobs j
             JOIN recruiter_profiles rp
                ON j.recruiter_profile_id = rp.profile_id
             WHERE j.job_id = $1
               AND rp.user_id = $2`,
            [jobId, userId]
        );

        if (jobCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Job not found or you are not the owner"
            });
        }

        // Get all applications for this job
        const result = await db.query(
            `SELECT
                a.application_id,
                a.status,
                a.resume_url,
                a.cover_letter,
                a.applied_at,
                a.updated_at,

                u.user_id,
                u.username,
                u.email,

                p.first_name,
                p.last_name,
                p.experience_years,
                p.resume_url AS profile_resume_url,
                p.linkedin_url,
                p.github_url

             FROM applications a

             JOIN job_seeker_profiles p
                ON a.job_seeker_profile_id = p.profile_id

             JOIN users u
                ON p.user_id = u.user_id

             WHERE a.job_id = $1

             ORDER BY a.applied_at DESC`,
            [jobId]
        );

        return res.status(200).json({
            message: "Applications fetched successfully",
            applications: result.rows
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
app.get("/api/recruiter/applications/:application_id", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;
        const applicationId = req.params.application_id;

        // 1. Only recruiters can access this API
        if (role !== "RECRUITER") {
            return res.status(403).json({
                message: "Only recruiters can view application details"
            });
        }

        // 2. Find the application and verify that
        //    the recruiter owns the job
        const result = await db.query(
            `SELECT
                a.application_id,
                a.job_id,
                a.status,
                a.resume_url,
                a.cover_letter,
                a.applied_at,
                a.updated_at,

                u.user_id,
                u.username,
                u.email,
                u.phone_no,

                p.first_name,
                p.last_name,
                p.address,
                p.graduation,
                p.bio,
                p.experience_years,
                p.resume_url AS profile_resume_url,
                p.linkedin_url,
                p.github_url,

                j.job_title,
                j.description,
                j.location,
                j.salary_min,
                j.salary_max,
                j.experience_min,
                j.experience_max,
                j.employment_type,
                j.job_status,

                c.company_id,
                c.company_name,
                c.description AS company_description,
                c.website,
                c.location AS company_location

             FROM applications a

             JOIN job_seeker_profiles p
                ON a.job_seeker_profile_id = p.profile_id

             JOIN users u
                ON p.user_id = u.user_id

             JOIN jobs j
                ON a.job_id = j.job_id

             JOIN recruiter_profiles rp
                ON j.recruiter_profile_id = rp.profile_id

             JOIN companies c
                ON j.company_id = c.company_id

             WHERE a.application_id = $1
               AND rp.user_id = $2`,
            [applicationId, userId]
        );

        // 3. Application doesn't exist
        //    OR recruiter doesn't own the job
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Application not found or you are not authorized to view it"
            });
        }

        // 4. Return application details
        return res.status(200).json({
            message: "Application details fetched successfully",
            application: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
app.patch("/api/recruiter/applications/:application_id/status", authMiddleware, async (req, res) => {
    let client;
    try {
         
        const userId = req.user.user_id;
        const role = req.user.role;
        const applicationId = req.params.application_id;
        const { status } = req.body;

        // 1. Only recruiters can update application status
        if (role !== "RECRUITER") {
            return res.status(403).json({
                message: "Only recruiters can update application status"
            });
        }

        // 2. Validate status
        const allowedStatuses = [
            "APPLIED",
            "SHORTLISTED",
            "INTERVIEW",
            "REJECTED",
            "HIRED"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid application status"
            });
        }

        // 3. Find application and verify recruiter owns the job
        const applicationCheck = await db.query(
            `SELECT
                a.application_id,
                a.status,
                j.recruiter_profile_id
             FROM applications a
             JOIN jobs j
                ON a.job_id = j.job_id
             JOIN recruiter_profiles rp
                ON j.recruiter_profile_id = rp.profile_id
             WHERE a.application_id = $1
               AND rp.user_id = $2`,
            [applicationId, userId]
        );

        if (applicationCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Application not found or you are not authorized"
            });
        }

        const oldStatus = applicationCheck.rows[0].status;
        const validTransitions = {
              APPLIED: ["SHORTLISTED", "REJECTED"],
              SHORTLISTED: ["INTERVIEW", "REJECTED"],
              INTERVIEW: ["HIRED", "REJECTED"],
              REJECTED: [],
              HIRED: []
        };

        if (!validTransitions[oldStatus].includes(status)) {
            return res.status(400).json({
             message: `Cannot change application status from ${oldStatus} to ${status}`
            });
        }

        // 4. Don't update if status is already the same
        if (oldStatus === status) {
            return res.status(400).json({
                message: "Application already has this status"
            });
        }
        client = await db.connect();
        await client.query("BEGIN");


        // 5. Update application status
        const updatedApplication = await client.query(
            `UPDATE applications
             SET status = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE application_id = $2
             RETURNING
                application_id,
                job_id,
                status,
                resume_url,
                cover_letter,
                applied_at,
                updated_at`,
            [status, applicationId]
        );

        // 6. Record status change in history
        await client.query(
            `INSERT INTO application_status_history
                (application_id, old_status, new_status, changed_by)
             VALUES
                ($1, $2, $3, $4)`,
            [applicationId, oldStatus, status, userId]
        );
        await client.query("COMMIT");
        client.release();


        // 7. Return updated application
        return res.status(200).json({
            message: "Application status updated successfully",
            application: updatedApplication.rows[0]
        });

    } catch (error) {
        if (client) {
        await client.query("ROLLBACK");
        client.release();
        }
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});

app.get("/api/applications/:application_id/history", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;
        const applicationId = req.params.application_id;

        // Only job seekers can view their application history
        if (role !== "JOB_SEEKER") {
            return res.status(403).json({
                message: "Only job seekers can view application history"
            });
        }

        // Check that this application belongs to the logged-in user
        const applicationCheck = await db.query(
            `SELECT a.application_id
             FROM applications a
             JOIN job_seeker_profiles p
                ON a.job_seeker_profile_id = p.profile_id
             WHERE a.application_id = $1
               AND p.user_id = $2`,
            [applicationId, userId]
        );

        if (applicationCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Application not found"
            });
        }

        // Get status history, including date and time
        const result = await db.query(
            `SELECT
                h.history_id,
                h.old_status,
                h.new_status,
                h.changed_by,
                h.changed_at
             FROM application_status_history h
             WHERE h.application_id = $1
             ORDER BY h.history_id ASC`,
            [applicationId]
        );

        return res.status(200).json({
            message: "Application history fetched successfully",
            history: result.rows
        });

    } catch (error) {
        console.error("Application history error:", error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});


app.get("/api/recruiter/jobs", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;

        if (role !== "RECRUITER") {
            return res.status(403).json({
                message: "Only recruiters can view their jobs"
            });
        }

        const result = await db.query(
            `SELECT
                j.job_id,
                j.job_title,
                j.description,
                j.location,
                j.salary_min,
                j.salary_max,
                j.experience_min,
                j.experience_max,
                j.employment_type,
                j.job_status,
                j.created_at,
                j.updated_at,
                c.company_name,
                COUNT(a.application_id)::int AS total_applications
             FROM jobs j
             JOIN recruiter_profiles rp
                ON j.recruiter_profile_id = rp.profile_id
             LEFT JOIN companies c
                ON j.company_id = c.company_id
             LEFT JOIN applications a
                ON j.job_id = a.job_id
             WHERE rp.user_id = $1
             GROUP BY j.job_id, c.company_name
             ORDER BY j.created_at DESC`,
            [userId]
        );

        return res.status(200).json({
            message: "Recruiter jobs fetched successfully",
            jobs: result.rows
        });

    } catch (error) {
        console.error("Fetch recruiter jobs error:", error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});

app.post("/api/recruiter/jobs", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;

        if (role !== "RECRUITER") {
            return res.status(403).json({
                message: "Only recruiters can create jobs"
            });
        }

        const {
            job_title,
            description,
            location,
            salary_min,
            salary_max,
            experience_min,
            experience_max,
            employment_type,
            job_status
        } = req.body;

        if (
            !job_title ||
            !description ||
            !location ||
            salary_min == null ||
            salary_max == null ||
            experience_min == null ||
            experience_max == null ||
            !employment_type
        ) {
            return res.status(400).json({
                message: "Please provide all required job details"
            });
        }

        const profileResult = await db.query(
            `SELECT profile_id, company_id
             FROM recruiter_profiles
             WHERE user_id = $1`,
            [userId]
        );

        if (profileResult.rows.length === 0) {
            return res.status(404).json({
                message: "Recruiter profile not found"
            });
        }

        const { profile_id, company_id } = profileResult.rows[0];

        const companyResult = await db.query(
            `SELECT company_id
             FROM companies
             WHERE company_id = $1`,
            [company_id]
        );

        if (companyResult.rows.length === 0) {
            return res.status(404).json({
                message: "Recruiter company not found"
            });
        }

        const result = await db.query(
            `INSERT INTO jobs (
                company_id,
                recruiter_profile_id,
                job_title,
                description,
                location,
                salary_min,
                salary_max,
                experience_min,
                experience_max,
                employment_type,
                job_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                company_id,
                profile_id,
                job_title,
                description,
                location,
                salary_min,
                salary_max,
                experience_min,
                experience_max,
                employment_type,
                job_status || "DRAFT"
            ]
        );

        return res.status(201).json({
            message: "Job created successfully",
            job: result.rows[0]
        });

    } catch (error) {
        console.error("Create job error:", error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});

 // UPDATE JOB STATUS
app.patch("/api/recruiter/jobs/:job_id/status", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;
        const { job_id } = req.params;
        const { job_status } = req.body;
        const parsedJobId = Number(job_id);

if (
    !/^\d+$/.test(job_id) ||
    !Number.isSafeInteger(parsedJobId) ||
    parsedJobId <= 0
) {
    return res.status(400).json({
        message: "Invalid job ID"
    });
}

        // Only recruiters can update job status
        if (role !== "RECRUITER") {
            return res.status(403).json({
                message: "Only recruiters can update job status"
            });
        }

        // Validate status
        const allowedStatuses = ["DRAFT", "ACTIVE"];

        if (!allowedStatuses.includes(job_status)) {
            return res.status(400).json({
                message: "Status must be DRAFT or ACTIVE"
            });
        }

        // Update only if the job belongs to this recruiter
        const result = await db.query(
            `UPDATE jobs j
             SET job_status = $1,
                 updated_at = CURRENT_TIMESTAMP
             FROM recruiter_profiles rp
             WHERE j.job_id = $2
               AND j.recruiter_profile_id = rp.profile_id
               AND rp.user_id = $3
             RETURNING j.*`,
            [job_status, parsedJobId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Job not found or you are not the owner"
            });
        }

        return res.status(200).json({
            message: "Job status updated successfully",
            job: result.rows[0]
        });

    } catch (error) {
        console.error("Update job status error:", error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});

app.post("/api/jobs/:job_id/save", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;
        const jobId = req.params.job_id;

        if (role !== "JOB_SEEKER") {
            return res.status(403).json({
                message: "Only job seekers can save jobs"
            });
        }

        const parsedJobId = Number(jobId);

        if (
            !/^\d+$/.test(jobId) ||
            !Number.isSafeInteger(parsedJobId) ||
            parsedJobId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid job ID"
            });
        }

        const profileResult = await db.query(
            `SELECT profile_id
             FROM job_seeker_profiles
             WHERE user_id = $1`,
            [userId]
        );

        if (profileResult.rows.length === 0) {
            return res.status(404).json({
                message: "Job seeker profile not found"
            });
        }

        const profileId = profileResult.rows[0].profile_id;

        const jobResult = await db.query(
            `SELECT job_id
             FROM jobs
             WHERE job_id = $1
               AND job_status = 'ACTIVE'`,
            [parsedJobId]
        );

        if (jobResult.rows.length === 0) {
            return res.status(404).json({
                message: "Active job not found"
            });
        }

        const result = await db.query(
            `INSERT INTO saved_jobs
                (job_seeker_profile_id, job_id)
             VALUES ($1, $2)
             RETURNING
                saved_job_id,
                job_id,
                saved_at`,
            [profileId, parsedJobId]
        );

        return res.status(201).json({
            message: "Job saved successfully",
            saved_job: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Job already saved"
            });
        }

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
app.delete("/api/jobs/:job_id/save", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const role = req.user.role;
        const jobId = req.params.job_id;

        if (role !== "JOB_SEEKER") {
            return res.status(403).json({
                message: "Only job seekers can unsave jobs"
            });
        }

        const parsedJobId = Number(jobId);

        if (
            !/^\d+$/.test(jobId) ||
            !Number.isSafeInteger(parsedJobId) ||
            parsedJobId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid job ID"
            });
        }

        const profileResult = await db.query(
            `SELECT profile_id
             FROM job_seeker_profiles
             WHERE user_id = $1`,
            [userId]
        );

        if (profileResult.rows.length === 0) {
            return res.status(404).json({
                message: "Job seeker profile not found"
            });
        }

        const profileId = profileResult.rows[0].profile_id;

        const result = await db.query(
            `DELETE FROM saved_jobs
             WHERE job_seeker_profile_id = $1
               AND job_id = $2
             RETURNING
                saved_job_id,
                job_id`,
            [profileId, parsedJobId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Saved job not found"
            });
        }

        return res.status(200).json({
            message: "Job unsaved successfully",
            saved_job: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
//notifications
app.get("/api/notifications", authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                notification_id,
                type,
                title,
                message,
                is_read,
                created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.user_id]
        );

        return res.status(200).json({
            message: "Notifications fetched successfully",
            notifications: result.rows
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
app.patch("/api/notifications/:notification_id/read", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const notificationId = req.params.notification_id;

        const parsedNotificationId = Number(notificationId);

        if (
            !/^\d+$/.test(notificationId) ||
            !Number.isSafeInteger(parsedNotificationId) ||
            parsedNotificationId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid notification ID"
            });
        }

        const result = await db.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE notification_id = $1
               AND user_id = $2
             RETURNING
                notification_id,
                type,
                title,
                message,
                is_read,
                created_at`,
            [parsedNotificationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        return res.status(200).json({
            message: "Notification marked as read",
            notification: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// ==================== CONVERSATIONS ====================

// CREATE / GET ONE-TO-ONE CONVERSATION
app.post("/api/conversations", authMiddleware, async (req, res) => {
    let client;

    try {
        const userId = req.user.user_id;
        const { receiver_id } = req.body;

        if (
            receiver_id === undefined ||
            receiver_id === null ||
            receiver_id === ""
        ) {
            return res.status(400).json({
                message: "Receiver ID is required"
            });
        }

        const parsedReceiverId = Number(receiver_id);

        if (
            !/^\d+$/.test(String(receiver_id)) ||
            !Number.isSafeInteger(parsedReceiverId) ||
            parsedReceiverId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid receiver ID"
            });
        }

        if (parsedReceiverId === Number(userId)) {
            return res.status(400).json({
                message: "You cannot start a conversation with yourself"
            });
        }

        const receiverResult = await db.query(
            `SELECT user_id, username, role
             FROM users
             WHERE user_id = $1`,
            [parsedReceiverId]
        );

        if (receiverResult.rows.length === 0) {
            return res.status(404).json({
                message: "Receiver not found"
            });
        }

        const existingConversation = await db.query(
            `SELECT c.conversation_id
             FROM conversations c
             JOIN conversation_participants cp1
                ON c.conversation_id = cp1.conversation_id
             JOIN conversation_participants cp2
                ON c.conversation_id = cp2.conversation_id
             WHERE cp1.user_id = $1
               AND cp2.user_id = $2`,
            [userId, parsedReceiverId]
        );

        if (existingConversation.rows.length > 0) {
            return res.status(200).json({
                message: "Conversation already exists",
                conversation_id: existingConversation.rows[0].conversation_id
            });
        }

        client = await db.connect();

        try {
            await client.query("BEGIN");

            const conversationResult = await client.query(
                `INSERT INTO conversations
                 DEFAULT VALUES
                 RETURNING conversation_id, created_at`
            );

            const conversationId =
                conversationResult.rows[0].conversation_id;

            await client.query(
                `INSERT INTO conversation_participants
                    (conversation_id, user_id)
                 VALUES ($1, $2)`,
                [conversationId, userId]
            );

            await client.query(
                `INSERT INTO conversation_participants
                    (conversation_id, user_id)
                 VALUES ($1, $2)`,
                [conversationId, parsedReceiverId]
            );

            await client.query("COMMIT");

            client.release();
            client = null;

            return res.status(201).json({
                message: "Conversation created successfully",
                conversation_id: conversationId
            });

        } catch (transactionError) {
            await client.query("ROLLBACK");
            throw transactionError;
        }

    } catch (error) {
        if (client) {
            client.release();
        }

        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// GET MY CONVERSATIONS
app.get("/api/conversations", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const result = await db.query(
            `SELECT
                c.conversation_id,
                c.created_at,
                c.updated_at,
                u.user_id AS other_user_id,
                u.username AS other_username,
                u.role AS other_user_role
             FROM conversations c
             JOIN conversation_participants cp1
                ON c.conversation_id = cp1.conversation_id
             JOIN conversation_participants cp2
                ON c.conversation_id = cp2.conversation_id
             JOIN users u
                ON cp2.user_id = u.user_id
             WHERE cp1.user_id = $1
               AND cp2.user_id != $1
             ORDER BY c.updated_at DESC`,
            [userId]
        );

        return res.status(200).json({
            message: "Conversations fetched successfully",
            conversations: result.rows
        });

    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// SEND MESSAGE
app.post(
    "/api/conversations/:conversation_id/messages",
    authMiddleware,
    async (req, res) => {
        let client;

        try {
            const userId = req.user.user_id;
            const conversationId = req.params.conversation_id;
            const { message_text } = req.body;

            const parsedConversationId = Number(conversationId);

            if (
                !/^\d+$/.test(conversationId) ||
                !Number.isSafeInteger(parsedConversationId) ||
                parsedConversationId <= 0
            ) {
                return res.status(400).json({
                    message: "Invalid conversation ID"
                });
            }

            if (
                typeof message_text !== "string" ||
                !message_text.trim()
            ) {
                return res.status(400).json({
                    message: "Message text is required"
                });
            }

            const participantResult = await db.query(
                `SELECT user_id
                 FROM conversation_participants
                 WHERE conversation_id = $1
                   AND user_id = $2`,
                [parsedConversationId, userId]
            );

            if (participantResult.rows.length === 0) {
                return res.status(403).json({
                    message: "You are not a participant of this conversation"
                });
            }

            client = await db.connect();

            try {
                await client.query("BEGIN");

                const messageResult = await client.query(
                    `INSERT INTO messages
                        (conversation_id, sender_id, message_text)
                     VALUES ($1, $2, $3)
                     RETURNING
                        message_id,
                        conversation_id,
                        sender_id,
                        message_text,
                        sent_at,
                        read_at`,
                    [
                        parsedConversationId,
                        userId,
                        message_text.trim()
                    ]
                );

                await client.query(
                    `UPDATE conversations
                     SET updated_at = CURRENT_TIMESTAMP
                     WHERE conversation_id = $1`,
                    [parsedConversationId]
                );

                await client.query("COMMIT");

                client.release();
                client = null;

                return res.status(201).json({
                    message: "Message sent successfully",
                    data: messageResult.rows[0]
                });

            } catch (transactionError) {
                await client.query("ROLLBACK");
                throw transactionError;
            }

        } catch (error) {
            if (client) {
                client.release();
            }

            console.error(error.message);

            return res.status(500).json({
                message: "Internal server error"
            });
        }
    }
);
// GET CONVERSATION MESSAGES
app.get(
    "/api/conversations/:conversation_id/messages",
    authMiddleware,
    async (req, res) => {
        try {
            const userId = req.user.user_id;
            const conversationId = req.params.conversation_id;

            const parsedConversationId = Number(conversationId);

            if (
                !/^\d+$/.test(conversationId) ||
                !Number.isSafeInteger(parsedConversationId) ||
                parsedConversationId <= 0
            ) {
                return res.status(400).json({
                    message: "Invalid conversation ID"
                });
            }

            const participantResult = await db.query(
                `SELECT user_id
                 FROM conversation_participants
                 WHERE conversation_id = $1
                   AND user_id = $2`,
                [parsedConversationId, userId]
            );

            if (participantResult.rows.length === 0) {
                return res.status(403).json({
                    message: "You are not a participant of this conversation"
                });
            }

            const result = await db.query(
                `SELECT
                    m.message_id,
                    m.conversation_id,
                    m.sender_id,
                    u.username AS sender_username,
                    m.message_text,
                    m.sent_at,
                    m.read_at
                 FROM messages m
                 JOIN users u
                    ON m.sender_id = u.user_id
                 WHERE m.conversation_id = $1
                 ORDER BY m.sent_at ASC`,
                [parsedConversationId]
            );

            return res.status(200).json({
                message: "Messages fetched successfully",
                conversation_id: parsedConversationId,
                messages: result.rows
            });

        } catch (error) {
            console.error(error.message);

            return res.status(500).json({
                message: "Internal server error"
            });
        }
    }
);
// MARK MESSAGE AS READ
app.patch(
    "/api/messages/:message_id/read",
    authMiddleware,
    async (req, res) => {
        try {
            const userId = req.user.user_id;
            const messageId = req.params.message_id;

            const parsedMessageId = Number(messageId);

            if (
                !/^\d+$/.test(messageId) ||
                !Number.isSafeInteger(parsedMessageId) ||
                parsedMessageId <= 0
            ) {
                return res.status(400).json({
                    message: "Invalid message ID"
                });
            }

            const messageResult = await db.query(
                `SELECT
                    m.message_id,
                    m.sender_id,
                    m.conversation_id
                 FROM messages m
                 JOIN conversation_participants cp
                    ON m.conversation_id = cp.conversation_id
                 WHERE m.message_id = $1
                   AND cp.user_id = $2`,
                [parsedMessageId, userId]
            );

            if (messageResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Message not found"
                });
            }

            const message = messageResult.rows[0];

            if (Number(message.sender_id) === Number(userId)) {
                return res.status(400).json({
                    message: "You cannot mark your own message as read"
                });
            }

            const result = await db.query(
                `UPDATE messages
                 SET read_at = CURRENT_TIMESTAMP
                 WHERE message_id = $1
                 RETURNING
                    message_id,
                    conversation_id,
                    sender_id,
                    message_text,
                    sent_at,
                    read_at`,
                [parsedMessageId]
            );

            return res.status(200).json({
                message: "Message marked as read",
                data: result.rows[0]
            });

        } catch (error) {
            console.error(error.message);

            return res.status(500).json({
                message: "Internal server error"
            });
        }
    }
);
// General Error Handler
app.use((err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    return res.status(500).json({
        message: "Internal server error"
    });
});

module.exports = app;