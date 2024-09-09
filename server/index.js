const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');


const app = express();


const PORT = process.env.PORT || 8081;

app.use(cors({
    origin: 'https://tabewo-client.vercel.app', // => deploy
            // 'http://localhost:3000' => devleop
    credentials: true
}))
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => res.send("express on 잘생긴 나호윤"));
app.use('/uploads', express.static('uploads')); // 정적 파일 경로

// Multer 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // 파일 이름 설정
    }
});

const upload = multer({ storage: storage });

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

const verifyUser = (req, res, next) => {
    const token = req.cookies.token; // 쿠키에서 토큰을 가져옴
    if (!token) {
        return res.json({ error: "You are not authenticated" });
    }

    jwt.verify(token, "jwt-secret-key", (err, decoded) => {
        if (err) {
            return res.json({ error: "Invalid token" });
        }

        req.user = decoded;  // 유저 정보를 request 객체에 저장
        next();  // 다음 미들웨어로 이동
    });
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
                    res.cookie('token', token, {
                        secure: true, // => deploy
                        // httpOnly: true => develop
                    });
                    
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



app.get("/api/get", (req, res) => {
    const sqlQuery = "SELECT * FROM board;";
    db.query(sqlQuery, (err, result) => {
        res.send(result);
    })
})


app.delete("/api/delete/:id", (req, res) => {
    const id = req.params.id;
    const sqlQuery = "DELETE FROM board WHERE id = ?";
    db.query(sqlQuery, id, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send('Deleted successfully');
        }
    });
});

app.put("/api/update", (req, res) => {
    const id = req.body.id;
    const title = req.body.title;
    const content = req.body.content;
    const sqlQuery = "UPDATE board SET title = ?, content = ? WHERE id = ?";
    db.query(sqlQuery, [title, content, id], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send('Updated successfully');
        }
    });
});

// 게시물 업로드 엔드포인트
app.post("/api/insert", upload.single('image'), (req, res) => {
    const title = req.body.title;
    const content = req.body.content;
    const date = req.body.date;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const sqlQuery = "INSERT INTO board (title, content, date, image) VALUES (?,?,?,?)";
    db.query(sqlQuery, [title, content, date, imagePath], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send('succ');
        }
    });
});

app.listen(PORT, () => {
    console.log('Listening on port', PORT);
})