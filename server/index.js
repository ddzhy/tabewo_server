const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');



const app = express();


const PORT = process.env.PORT || 8081;

app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ["POST", "GET", "OPTION"],
    credentials: true
}))
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => res.send("express on 잘생긴 나호윤"));

const db = mysql.createConnection({
    host: "bksiznx43rtgocveooqs-mysql.services.clever-cloud.com",
    user: "u1nm1eyt6osgme5i",
    password: "tsc3QVnnpxhJ7sIpIL3Y",
    database: "bksiznx43rtgocveooqs",
});

db.connect((err) => {
    if (err) {
        console.error('MySQL Connection Error:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// JWT 검증 미들웨어 함수
const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.json({ error: "You are not authenticated" });
    } else {
        jwt.verify(token, "jwt-secret-key", (err, decoded) => {
            if (err) {
                return res.json({ error: "Invalid token" });
            } else {
                req.user = decoded;
                next();
            }
        });
    }
};

// 회원가입 엔드포인트
app.post('/signup', (req, res) => {
    const sql = "INSERT INTO login (`name`, `email`, `password`) VALUES (?)";

    bcrypt.hash(req.body.password, 10, (err, hash) => {
        if (err) {
            return res.json("Error hashing password");
        }

        const values = [
            req.body.name,
            req.body.email,
            hash // 해시된 비밀번호 저장
        ];

        db.query(sql, [values], (err, data) => {
            if (err) {
                return res.json("Error");
            }
            return res.json(data);
        });
    });
});

app.post('/login', (req, res) => {
    const sql = "SELECT * FROM login WHERE `email` = ?";
    db.query(sql, [req.body.email], (err, data) => {
        if (err) {
            return res.json("Error");
        }
        if (data.length > 0) {
            bcrypt.compare(req.body.password, data[0].password, (err, result) => {
                if (err) {
                    return res.json("Error comparing passwords");
                }
                if (result) {
                    const name = data[0].name;
                    const email = data[0].email;
                    const token = jwt.sign({ name, email }, "jwt-secret-key", { expiresIn: '1d' });
                    res.cookie('token', token, { httpOnly: true });
                    return res.json("Success");
                } else {
                    return res.json("Invalid password");
                }
            });
        } else {
            return res.json("User not found");
        }
    });
});

// 로그아웃 엔드포인트
app.post('/logout', (req, res) => {
    res.clearCookie('token'); // JWT 토큰 쿠키 삭제
    return res.json({ status: "Success", message: "Logged out successfully" });
});


// /mypage 엔드포인트
app.get('/mypage', verifyUser, (req, res) => {
    const user = req.user;
    return res.json({ status: "Success", name: user.name, email: user.email });
});

app.listen(PORT, () => {
    console.log('Listening on port', PORT);
});
