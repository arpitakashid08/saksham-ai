import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:5001/login",
        {
          email,
          password,
        }
      );

      localStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );

      alert("Login Successful!");
      navigate("/dashboard");
    } catch (error) {
      alert("Invalid Email or Password");
    }
  };

  const signup = async () => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:5001/signup",
        {
          name,
          email,
          password,
        }
      );

      alert(response.data.message);

      setIsLogin(true);
      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      alert("Signup Failed");
    }
  };

  return (
    <div className="container">

      {/* LEFT PANEL */}

      <div className="left-panel">
        <h1>🤟 SAKSHAM AI</h1>

        <h3>Accessibility Platform</h3>

        <p>
          Empowering communication and independence
          through AI-powered accessibility solutions.
        </p>
      </div>

      {/* RIGHT PANEL */}

      <div className="right-panel">

        <div className="tab-buttons">
          <button
            className={isLogin ? "active-tab" : ""}
            onClick={() => setIsLogin(true)}
          >
            LOGIN
          </button>

          <button
            className={!isLogin ? "active-tab" : ""}
            onClick={() => setIsLogin(false)}
          >
            SIGN UP
          </button>
        </div>

        {isLogin ? (
          <>
            <h2>WELCOME BACK</h2>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            <button onClick={login}>
              LOGIN
            </button>
          </>
        ) : (
          <>
            <h2>CREATE ACCOUNT</h2>

            <input
              placeholder="Full Name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            <button onClick={signup}>
              CREATE ACCOUNT
            </button>
          </>
        )}

      </div>
    </div>
  );
}