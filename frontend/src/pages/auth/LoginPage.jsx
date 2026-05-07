import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0|\+84)\d{9,10}$/;

const normalizePhone = (value) => {
  const cleaned = value.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+84")) return `0${cleaned.slice(3)}`;
  return cleaned;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    login,
    register,
    sendVerificationEmail,
    verifyEmailToken,
    forgotPassword,
    verifyOtp,
    resetPassword,
  } = useAuth();

  const defaultMode = useMemo(
    () => (window.location.pathname === "/register" ? "register" : "login"),
    []
  );

  const [mode, setMode] = useState(defaultMode);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [sendingVerifyEmail, setSendingVerifyEmail] = useState(false);

  const [loginForm, setLoginForm] = useState({
    identifier: "",
    password: "",
    rememberMe: true,
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [forgotForm, setForgotForm] = useState({
    identifier: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [checkingOtp, setCheckingOtp] = useState(false);

  useEffect(() => {
    const token = searchParams.get("verify_token");
    if (!token) return;

    setLoading(true);
    setError("");
    verifyEmailToken(token)
      .then((data) => {
        setSuccess(data.message || "Xac thuc email thanh cong.");
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Khong the xac thuc email.");
      })
      .finally(() => setLoading(false));
  }, [searchParams, verifyEmailToken]);

  const clearFeedback = () => {
    setError("");
    setSuccess("");
  };

  const onLogin = async (event) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    setUnverifiedEmail("");

    try {
      const user = await login(loginForm.identifier, loginForm.password, loginForm.rememberMe);
      navigate(user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      const payload = err.response?.data || {};
      if (payload.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(payload.email || "");
      }
      setError(payload.error || "Dang nhap that bai");
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!registerForm.name.trim()) {
      setError("Vui long nhap ho ten");
      return;
    }
    if (!EMAIL_REGEX.test(registerForm.email.trim().toLowerCase())) {
      setError("Email khong hop le");
      return;
    }
    const normalizedPhone = normalizePhone(registerForm.phone);
    if (!PHONE_REGEX.test(normalizedPhone)) {
      setError("So dien thoai khong hop le");
      return;
    }
    if (registerForm.password.length < 6) {
      setError("Mat khau phai co it nhat 6 ky tu");
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Xac nhan mat khau khong khop");
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        name: registerForm.name.trim(),
        email: registerForm.email.trim().toLowerCase(),
        phone: normalizedPhone,
        password: registerForm.password,
        confirmPassword: registerForm.confirmPassword,
      });
      setSuccess(result.message || "Dang ky thanh cong. Vui long kiem tra email de xac thuc.");
      setMode("login");
      setLoginForm((prev) => ({ ...prev, identifier: registerForm.email.trim().toLowerCase() }));
      setRegisterForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError(err.response?.data?.error || "Dang ky that bai");
    } finally {
      setLoading(false);
    }
  };

  const onSendForgotOtp = async (event) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    setOtpVerified(false);

    try {
      const data = await forgotPassword(forgotForm.identifier);
      setOtpSent(true);
      setSuccess(data.message || "Da gui OTP qua email.");
    } catch (err) {
      setError(err.response?.data?.error || "Khong the gui OTP");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    clearFeedback();
    setCheckingOtp(true);
    try {
      const data = await verifyOtp({ identifier: forgotForm.identifier, otp: forgotForm.otp });
      setOtpVerified(true);
      setSuccess(data.message || "OTP hop le.");
    } catch (err) {
      setOtpVerified(false);
      setError(err.response?.data?.error || "OTP khong hop le");
    } finally {
      setCheckingOtp(false);
    }
  };

  const onResetPassword = async (event) => {
    event.preventDefault();
    clearFeedback();
    if (!otpVerified) {
      setError("Vui long xac thuc OTP truoc khi dat lai mat khau");
      return;
    }
    if (forgotForm.password.length < 6) {
      setError("Mat khau phai co it nhat 6 ky tu");
      return;
    }
    if (forgotForm.password !== forgotForm.confirmPassword) {
      setError("Xac nhan mat khau khong khop");
      return;
    }

    setLoading(true);
    try {
      const data = await resetPassword({
        identifier: forgotForm.identifier,
        otp: forgotForm.otp,
        password: forgotForm.password,
        confirmPassword: forgotForm.confirmPassword,
      });
      setSuccess(data.message || "Dat lai mat khau thanh cong.");
      setMode("login");
      setOtpSent(false);
      setOtpVerified(false);
      setForgotForm({ identifier: "", otp: "", password: "", confirmPassword: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Khong the dat lai mat khau");
    } finally {
      setLoading(false);
    }
  };

  const onResendVerification = async () => {
    if (!unverifiedEmail) return;
    clearFeedback();
    setSendingVerifyEmail(true);
    try {
      const data = await sendVerificationEmail(unverifiedEmail);
      setSuccess(data.message || "Da gui lai email xac thuc.");
    } catch (err) {
      setError(err.response?.data?.error || "Khong the gui lai email xac thuc");
    } finally {
      setSendingVerifyEmail(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    clearFeedback();
    setUnverifiedEmail("");
    setOtpSent(false);
    setOtpVerified(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.side}>
        <div>
          <h2 style={styles.sideTitle}>LUXE</h2>
          <p style={styles.sideSub}>Luxury Fashion Experience</p>
          <p style={styles.sideQuote}>
            Dong hanh cung ban tu dang ky tai khoan den mua sam va theo doi don hang de dang.
          </p>
        </div>
      </div>

      <div style={styles.formSide}>
        <div style={styles.formWrap}>
          <Link to="/" style={styles.logo}>
            LUXE
          </Link>

          <div style={styles.tabs}>
            <button
              type="button"
              style={{ ...styles.tabBtn, ...(mode === "login" ? styles.tabBtnActive : {}) }}
              onClick={() => switchMode("login")}
            >
              Dang nhap
            </button>
            <button
              type="button"
              style={{ ...styles.tabBtn, ...(mode === "register" ? styles.tabBtnActive : {}) }}
              onClick={() => switchMode("register")}
            >
              Dang ky
            </button>
            <button
              type="button"
              style={{ ...styles.tabBtn, ...(mode === "forgot" ? styles.tabBtnActive : {}) }}
              onClick={() => switchMode("forgot")}
            >
              Quen mat khau
            </button>
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          {mode === "login" && (
            <form onSubmit={onLogin} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Email hoac so dien thoai</label>
                <input
                  type="text"
                  value={loginForm.identifier}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, identifier: e.target.value }))}
                  placeholder="email@example.com / 09xxxxxxxx"
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Mat khau</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <label style={styles.rememberLine}>
                <input
                  type="checkbox"
                  checked={loginForm.rememberMe}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, rememberMe: e.target.checked }))}
                />
                <span>Remember me</span>
              </label>

              {unverifiedEmail && (
                <div style={styles.inlineInfo}>
                  <span>Tai khoan chua xac thuc email.</span>
                  <button type="button" style={styles.linkBtn} onClick={onResendVerification} disabled={sendingVerifyEmail}>
                    {sendingVerifyEmail ? "Dang gui..." : "Gui lai email xac thuc"}
                  </button>
                </div>
              )}

              <button className="btn-primary" type="submit" style={styles.submit} disabled={loading}>
                {loading ? "Dang xu ly..." : "Dang nhap"}
              </button>
              <button type="button" style={styles.ghostBtn} onClick={() => switchMode("forgot")}>
                Quen mat khau?
              </button>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={onRegister} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Ho va ten</label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nguyen Van A"
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>So dien thoai</label>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="09xxxxxxxx"
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Mat khau</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="It nhat 6 ky tu"
                  required
                  minLength={6}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Xac nhan mat khau</label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  placeholder="Nhap lai mat khau"
                  required
                  minLength={6}
                />
              </div>
              <button className="btn-primary" type="submit" style={styles.submit} disabled={loading}>
                {loading ? "Dang xu ly..." : "Tao tai khoan"}
              </button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={otpSent ? onResetPassword : onSendForgotOtp} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Email hoac so dien thoai</label>
                <input
                  type="text"
                  value={forgotForm.identifier}
                  onChange={(e) => setForgotForm((prev) => ({ ...prev, identifier: e.target.value }))}
                  placeholder="email@example.com / 09xxxxxxxx"
                  required
                />
              </div>

              {!otpSent && (
                <button className="btn-primary" type="submit" style={styles.submit} disabled={loading}>
                  {loading ? "Dang gui..." : "Gui OTP qua email"}
                </button>
              )}

              {otpSent && (
                <>
                  <div style={styles.field}>
                    <label style={styles.label}>Ma OTP</label>
                    <div style={styles.inlineRow}>
                      <input
                        type="text"
                        value={forgotForm.otp}
                        onChange={(e) => setForgotForm((prev) => ({ ...prev, otp: e.target.value }))}
                        placeholder="Nhap OTP 6 so"
                        required
                      />
                      <button
                        type="button"
                        style={styles.secondaryBtn}
                        onClick={onVerifyOtp}
                        disabled={checkingOtp || !forgotForm.otp}
                      >
                        {checkingOtp ? "Dang check..." : "Xac thuc OTP"}
                      </button>
                    </div>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Mat khau moi</label>
                    <input
                      type="password"
                      value={forgotForm.password}
                      onChange={(e) => setForgotForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="It nhat 6 ky tu"
                      minLength={6}
                      required
                      disabled={!otpVerified}
                    />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Xac nhan mat khau moi</label>
                    <input
                      type="password"
                      value={forgotForm.confirmPassword}
                      onChange={(e) =>
                        setForgotForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="Nhap lai mat khau moi"
                      minLength={6}
                      required
                      disabled={!otpVerified}
                    />
                  </div>

                  <button className="btn-primary" type="submit" style={styles.submit} disabled={loading || !otpVerified}>
                    {loading ? "Dang cap nhat..." : "Dat lai mat khau"}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    background: "#f8f6f3",
  },
  side: {
    flex: "0 0 420px",
    backgroundImage:
      "linear-gradient(rgba(0,0,0,0.58), rgba(0,0,0,0.58)), url(https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1200&q=80)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    padding: "56px",
  },
  sideTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 52,
    fontWeight: 300,
    letterSpacing: "0.24em",
    marginBottom: 10,
  },
  sideSub: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    opacity: 0.82,
    marginBottom: 24,
  },
  sideQuote: {
    maxWidth: 320,
    lineHeight: 1.7,
    opacity: 0.9,
    fontSize: 14,
  },
  formSide: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
  },
  formWrap: {
    width: "100%",
    maxWidth: 460,
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.08)",
    padding: "36px 34px",
  },
  logo: {
    display: "block",
    marginBottom: 18,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 30,
    letterSpacing: "0.22em",
  },
  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    border: "1px solid rgba(0,0,0,0.1)",
    marginBottom: 18,
  },
  tabBtn: {
    padding: "10px 12px",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    background: "#fff",
    borderRight: "1px solid rgba(0,0,0,0.08)",
  },
  tabBtnActive: {
    background: "#0a0a0a",
    color: "#fff",
  },
  error: {
    marginBottom: 14,
    background: "#fff5f5",
    color: "#b42318",
    border: "1px solid rgba(180,35,24,0.2)",
    padding: "10px 12px",
    fontSize: 13,
  },
  success: {
    marginBottom: 14,
    background: "#ecfdf3",
    color: "#067647",
    border: "1px solid rgba(6,118,71,0.22)",
    padding: "10px 12px",
    fontSize: 13,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#444",
  },
  rememberLine: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#444",
  },
  inlineInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    background: "#f9fafb",
    border: "1px solid rgba(0,0,0,0.08)",
    fontSize: 13,
  },
  submit: {
    width: "100%",
    marginTop: 4,
  },
  ghostBtn: {
    marginTop: 4,
    background: "transparent",
    color: "#0a0a0a",
    textDecoration: "underline",
    fontSize: 13,
    padding: "2px 0",
  },
  linkBtn: {
    background: "transparent",
    border: "none",
    color: "#0a0a0a",
    textDecoration: "underline",
    fontSize: 12,
    fontWeight: 500,
  },
  inlineRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 8,
  },
  secondaryBtn: {
    padding: "10px 12px",
    border: "1px solid #0a0a0a",
    background: "#fff",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
};
