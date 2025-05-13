const express = require("express");
const authService = require("../services/auth.service");
const { authenticateToken } = require("../middleware/auth.middleware");
const {
  registerValidation,
  loginValidation,
  resendVerificationValidation,
  changePasswordValidation,
  removeUserValidation,
  tokenValidation,
  logoutValidation,
  verifyEmailValidation
} = require("./auth.validator.js");
const { registerLimiter, loginLimiter, emailLimiter } = require("./auth.ratelimit.js");
const { asyncHandler, handleValidationErrors } = require("../middleware/error.middleware");
const passport = require('../config/passport.config');
const crypto = require('crypto');
const router = express.Router();

router.post("/register",
  registerLimiter,
  registerValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const result = await authService.registerWithAutoLogin(username, email, password);
    res.status(201).json({
      success: true,
      data: result
    });
  })
);

router.post("/login",
  loginLimiter,
  loginValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const result = await authService.login(username, email, password);
    res.json({
      success: true,
      data: result
    });
  })
);

router.get("/verify-email",
  verifyEmailValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token } = req.query;
    const result = await authService.verifyEmail(token);
    res.json({
      success: true,
      data: result
    });
  })
);

router.post("/resend-verification",
  emailLimiter,
  resendVerificationValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.resendVerificationEmail(email);
    res.json({
      success: true,
      data: result
    });
  })
);

router.post("/change-password",
  changePasswordValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token, username, email, oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(token, username, email, oldPassword, newPassword);
    res.json({
      success: true,
      data: result
    });
  })
);


router.post("/token",
  tokenValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    const result = await authService.refreshToken(token);
    res.json({
      success: true,
      data: result
    });
  })
);

router.delete("/logout",
  logoutValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    await authService.logout(token);
    res.sendStatus(204);
  })
);

router.delete("/remove-user",
  removeUserValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token, username, email, password } = req.body;
    const result = await authService.removeUser(token, username, email, password);
    res.json({
      success: true,
      data: result
    });
  })
);

router.post("/verify", authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      valid: true,
      user: req.user
    }
  });
});
router.get('/test-login', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Auth System</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        button, .btn { 
          background: #4285F4; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 4px; 
          font-size: 16px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          margin: 5px 0;
        }
        .btn-danger { background: #dc3545; }
        .btn-success { background: #28a745; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; }
        input[type="text"], input[type="email"], input[type="password"] {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        }
        .tab {
          overflow: hidden;
          border: 1px solid #ccc;
          background-color: #f1f1f1;
          margin-bottom: 20px;
        }
        .tab button {
          background-color: inherit;
          float: left;
          border: none;
          outline: none;
          cursor: pointer;
          padding: 14px 16px;
          transition: 0.3s;
          color: black;
        }
        .tab button:hover { background-color: #ddd; }
        .tab button.active { background-color: #ccc; }
        .tabcontent {
          display: none;
          padding: 20px;
          border: 1px solid #ccc;
          border-top: none;
          animation: fadeEffect 1s;
        }
        @keyframes fadeEffect {
          from {opacity: 0;}
          to {opacity: 1;}
        }
        pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow: auto; }
        .success { color: green; }
        .error { color: red; }
        #user-info { 
          background: #f9f9f9; 
          padding: 15px; 
          border-radius: 4px; 
          margin-bottom: 20px;
          border: 1px solid #ddd;
        }
        #debug-panel {
          margin-top: 30px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Testowa Platforma Autentykacji</h1>
        
        <!-- Status zalogowania -->
        <div id="user-info">
          <h3>Status:</h3>
          <div id="auth-status">Sprawdzanie...</div>
          <div id="auth-actions" style="margin-top: 10px; display: none;">
            <button id="logout-btn" class="btn btn-danger">Wyloguj</button>
          </div>
        </div>
        
        <!-- Zakładki -->
        <div class="tab">
          <button class="tablinks" onclick="openTab(event, 'RegisterTab')" id="defaultOpen">Rejestracja</button>
          <button class="tablinks" onclick="openTab(event, 'LoginTab')">Logowanie</button>
          <button class="tablinks" onclick="openTab(event, 'GoogleTab')">Google OAuth</button>
          <button class="tablinks" onclick="openTab(event, 'LinkGoogleTab')">Połącz z Google</button>
          <button class="tablinks" onclick="openTab(event, 'TokenTab')">Tokeny</button>
        </div>
        
        <!-- Zakładka Rejestracji -->
        <div id="RegisterTab" class="tabcontent">
          <h2>Rejestracja</h2>
          <form id="register-form">
            <div class="form-group">
              <label for="reg-username">Nazwa użytkownika:</label>
              <input type="text" id="reg-username" required minlength="3">
            </div>
            <div class="form-group">
              <label for="reg-email">Email:</label>
              <input type="email" id="reg-email" required>
            </div>
            <div class="form-group">
              <label for="reg-password">Hasło:</label>
              <input type="password" id="reg-password" required minlength="8" 
                     placeholder="Min. 8 znaków, litera duża, mała, cyfra, znak specjalny">
            </div>
            <button type="submit" class="btn btn-success">Zarejestruj</button>
          </form>
          <div id="register-result" class="result"></div>
        </div>
        
        <!-- Zakładka Logowania -->
        <div id="LoginTab" class="tabcontent">
          <h2>Logowanie</h2>
          <form id="login-form">
            <div class="form-group">
              <label for="login-identifier">Nazwa użytkownika lub Email:</label>
              <input type="text" id="login-identifier" required>
            </div>
            <div class="form-group">
              <label for="login-password">Hasło:</label>
              <input type="password" id="login-password" required>
            </div>
            <button type="submit" class="btn btn-success">Zaloguj</button>
          </form>
          <div id="login-result" class="result"></div>
        </div>
        
        <!-- Zakładka Google OAuth -->
        <div id="GoogleTab" class="tabcontent">
          <h2>Logowanie przez Google</h2>
          <p>Kliknij poniższy przycisk, aby zalogować się lub zarejestrować przez Google:</p>
          <a href="/auth/google" class="btn">Zaloguj przez Google</a>
          <div id="google-result" class="result"></div>
        </div>
        
        <!-- Zakładka Połącz z Google -->
        <div id="LinkGoogleTab" class="tabcontent">
          <h2>Połącz konto z Google</h2>
          <p>Jeśli jesteś już zalogowany używając nazwy użytkownika i hasła, możesz połączyć swoje konto z Google:</p>
          <div id="link-info">
            <p>Musisz być zalogowany, aby połączyć konto z Google.</p>
          </div>
          <a href="/auth/google" class="btn" id="link-google-btn" style="display:none;">Połącz z Google</a>
          <div id="link-result" class="result"></div>
        </div>
        
        <!-- Zakładka Tokenów -->
        <div id="TokenTab" class="tabcontent">
          <h2>Informacje o tokenach</h2>
          <div id="token-info">
            <h3>Twoje tokeny:</h3>
            <pre id="token-display">Brak tokenów</pre>
          </div>
          <button id="verify-token" class="btn">Zweryfikuj token</button>
          <div id="verification-result" class="result"></div>
        </div>
        
        <!-- Panel debugowania -->
        <div id="debug-panel">
          <h3>Panel debugowania:</h3>
          <pre id="debug-output">Tutaj będą pokazywane komunikaty debug.</pre>
          <button id="clear-debug" class="btn btn-danger">Wyczyść</button>
        </div>
        
        <script>
          const debugLog = (message, data) => {
            const debugOutput = document.getElementById('debug-output');
            
            let formattedMessage = new Date().toLocaleTimeString() + ': ' + message;
            if (data) {
              if (typeof data === 'object') {
                try {
                  formattedMessage += '\\n' + JSON.stringify(data, null, 2);
                } catch (e) {
                  formattedMessage += '\\n[Obiekt nie może być serializowany]';
                }
              } else {
                formattedMessage += '\\n' + data;
              }
            }
            
            debugOutput.textContent = formattedMessage + '\\n\\n' + debugOutput.textContent;
            console.log(message, data);
          };
          
          const debugResponse = async (response) => {
            const clonedResponse = response.clone();
            try {
              const text = await clonedResponse.text();
              debugLog('Odpowiedź serwera', text);
              
              try {
                const json = JSON.parse(text);
                debugLog('Odpowiedź jako JSON', json);
                return response;
              } catch (e) {
                debugLog('Odpowiedź nie jest poprawnym JSON', e.message);
                return response;
              }
            } catch (e) {
              debugLog('Nie udało się odczytać odpowiedzi', e.message);
              return response;
            }
          };
          
          function openTab(evt, tabName) {
            var i, tabcontent, tablinks;
            tabcontent = document.getElementsByClassName("tabcontent");
            for (i = 0; i < tabcontent.length; i++) {
              tabcontent[i].style.display = "none";
            }
            tablinks = document.getElementsByClassName("tablinks");
            for (i = 0; i < tablinks.length; i++) {
              tablinks[i].className = tablinks[i].className.replace(" active", "");
            }
            document.getElementById(tabName).style.display = "block";
            evt.currentTarget.className += " active";
            
            if (tabName === 'TokenTab') {
              updateTokenDisplay();
            }
            if (tabName === 'LinkGoogleTab') {
              updateLinkGoogleStatus();
            }
          }
          
          document.getElementById("defaultOpen").click();
          
          function checkTokensFromHash() {
            if (window.location.hash) {
              debugLog('Wykryto hash w URL', window.location.hash);
              const urlParams = new URLSearchParams(window.location.hash.substring(1));
              const accessToken = urlParams.get('access_token');
              const refreshToken = urlParams.get('refresh_token');
              
              if (accessToken && refreshToken) {
                debugLog('Znaleziono tokeny w URL hash');
                localStorage.setItem('access_token', accessToken);
                localStorage.setItem('refresh_token', refreshToken);
                
                history.replaceState(null, null, ' ');
                
                updateAuthStatus();
                return true;
              }
            }
            return false;
          }
          
          function updateTokenDisplay() {
            const tokenDisplay = document.getElementById('token-display');
            const accessToken = localStorage.getItem('access_token');
            const refreshToken = localStorage.getItem('refresh_token');
            
            if (accessToken && refreshToken) {
              const tokenInfo = {
                access_token: accessToken.substring(0, 12) + '...',
                refresh_token: refreshToken.substring(0, 12) + '...',
                full_length: {
                  access_token: accessToken.length,
                  refresh_token: refreshToken.length
                }
              };
              tokenDisplay.textContent = JSON.stringify(tokenInfo, null, 2);
            } else {
              tokenDisplay.textContent = 'Brak tokenów';
            }
          }
          
          function updateAuthStatus() {
            const statusDiv = document.getElementById('auth-status');
            const actionsDiv = document.getElementById('auth-actions');
            const accessToken = localStorage.getItem('access_token');
            
            if (!accessToken) {
              statusDiv.innerHTML = '<p><span class="error">⚠️ Nie zalogowano</span></p>';
              actionsDiv.style.display = 'none';
              updateLinkGoogleStatus();
              return;
            }
            
            debugLog('Weryfikacja tokenu dostępu...');
            
            fetch('/auth/verify', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + accessToken
              }
            })
            .then(debugResponse)
            .then(response => {
              if (!response.ok) {
                throw new Error('Błąd serwera: ' + response.status);
              }
              
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                return response.json();
              } else {
                throw new Error('Serwer zwrócił odpowiedź w nieoczekiwanym formacie');
              }
            })
            .then(data => {
              debugLog('Odpowiedź weryfikacji tokenu', data);
              
              if (data.success && data.data && data.data.valid) {
                statusDiv.innerHTML = '<p><span class="success">✅ Zalogowano</span></p>';
                statusDiv.innerHTML += '<p>ID: ' + data.data.user.id + '</p>';
                actionsDiv.style.display = 'block';
                updateLinkGoogleStatus();
              } else {
                statusDiv.innerHTML = '<p><span class="error">⚠️ Token nieprawidłowy</span></p>';
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                actionsDiv.style.display = 'none';
                updateLinkGoogleStatus();
              }
            })
            .catch(error => {
              debugLog('Błąd weryfikacji tokenu', error.message);
              statusDiv.innerHTML = '<p><span class="error">⚠️ Błąd weryfikacji: ' + error.message + '</span></p>';
              actionsDiv.style.display = 'none';
              updateLinkGoogleStatus();
            });
          }
          
          function updateLinkGoogleStatus() {
            const linkInfo = document.getElementById('link-info');
            const linkButton = document.getElementById('link-google-btn');
            const accessToken = localStorage.getItem('access_token');
            
            if (accessToken) {
              linkInfo.innerHTML = '<p>Jesteś zalogowany. Możesz teraz połączyć konto z Google.</p>';
              linkButton.style.display = 'inline-block';
            } else {
              linkInfo.innerHTML = '<p>Musisz być zalogowany, aby połączyć konto z Google.</p>';
              linkButton.style.display = 'none';
            }
          }
          
          document.getElementById('verify-token').addEventListener('click', function() {
            const resultDiv = document.getElementById('verification-result');
            const accessToken = localStorage.getItem('access_token');
            
            if (!accessToken) {
              resultDiv.innerHTML = '<p class="error">Brak tokenu do weryfikacji</p>';
              return;
            }
            
            resultDiv.innerHTML = '<p>Weryfikacja...</p>';
            debugLog('Weryfikacja tokenu na żądanie użytkownika');
            
            fetch('/auth/verify', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + accessToken
              }
            })
            .then(debugResponse)
            .then(response => {
              if (!response.ok) {
                throw new Error('Błąd serwera: ' + response.status);
              }
              
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                return response.json();
              } else {
                throw new Error('Serwer zwrócił odpowiedź w nieoczekiwanym formacie');
              }
            })
            .then(data => {
              if (data.success) {
                resultDiv.innerHTML = '<p class="success">Token zweryfikowany pomyślnie!</p>' +
                  '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
              } else {
                resultDiv.innerHTML = '<p class="error">Weryfikacja nieudana</p>' +
                  '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
              }
            })
            .catch(error => {
              resultDiv.innerHTML = '<p class="error">Błąd weryfikacji: ' + error.message + '</p>';
              debugLog('Błąd weryfikacji tokenu', error);
            });
          });
          
          document.getElementById('register-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const resultDiv = document.getElementById('register-result');
            
            const username = document.getElementById('reg-username').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            
            const registerData = { username, email, password };
            debugLog('Rozpoczęcie rejestracji', { username, email, password: '********' });
            
            resultDiv.innerHTML = '<p>Rejestracja...</p>';
            
            fetch('/auth/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(registerData),
            })
            .then(debugResponse)
            .then(response => {
              if (!response.ok) {
                throw new Error('Błąd serwera: ' + response.status);
              }
              
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                return response.json();
              } else {
                throw new Error('Serwer zwrócił odpowiedź w nieoczekiwanym formacie');
              }
            })
            .then(data => {
              debugLog('Odpowiedź rejestracji', data);
              
              if (data.success) {
                resultDiv.innerHTML = '<p class="success">Rejestracja udana!</p>';
                if (data.data.accessToken && data.data.refreshToken) {
                  localStorage.setItem('access_token', data.data.accessToken);
                  localStorage.setItem('refresh_token', data.data.refreshToken);
                  resultDiv.innerHTML += '<p>Automatyczne logowanie udane.</p>';
                  updateAuthStatus();
                } else {
                  resultDiv.innerHTML += '<p>Sprawdź email w celu weryfikacji konta.</p>';
                }
              } else {
                resultDiv.innerHTML = '<p class="error">Błąd: ' + (data.error || 'Nieznany błąd') + '</p>';
              }
            })
            .catch((error) => {
              resultDiv.innerHTML = '<p class="error">Błąd: ' + error.message + '</p>';
              debugLog('Błąd rejestracji', error);
            });
          });
          
          document.getElementById('login-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const resultDiv = document.getElementById('login-result');
            
            const identifier = document.getElementById('login-identifier').value;
            const password = document.getElementById('login-password').value;
            
            const isEmail = /\\S+@\\S+\\.\\S+/.test(identifier);
            const loginData = {
              password
            };
            
            if (isEmail) {
              loginData.email = identifier;
            } else {
              loginData.username = identifier;
            }
            
            debugLog('Rozpoczęcie logowania', { identifier, isEmail, password: '********' });
            resultDiv.innerHTML = '<p>Logowanie...</p>';
            
            fetch('/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(loginData),
            })
            .then(debugResponse)
            .then(response => {
              if (!response.ok) {
                throw new Error('Błąd serwera: ' + response.status);
              }
              
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                return response.json();
              } else {
                throw new Error('Serwer zwrócił odpowiedź w nieoczekiwanym formacie');
              }
            })
            .then(data => {
              debugLog('Odpowiedź logowania', data);
              
              if (data.success) {
                resultDiv.innerHTML = '<p class="success">Logowanie udane!</p>';
                localStorage.setItem('access_token', data.data.accessToken);
                localStorage.setItem('refresh_token', data.data.refreshToken);
                updateAuthStatus();
                updateTokenDisplay();
              } else {
                resultDiv.innerHTML = '<p class="error">Błąd: ' + (data.error || 'Nieprawidłowe dane logowania') + '</p>';
              }
            })
            .catch((error) => {
              resultDiv.innerHTML = '<p class="error">Błąd: ' + error.message + '</p>';
              debugLog('Błąd logowania', error);
            });
          });
          
          document.getElementById('logout-btn').addEventListener('click', function() {
            const refreshToken = localStorage.getItem('refresh_token');
            
            if (refreshToken) {
              debugLog('Rozpoczęcie wylogowania');
              
              fetch('/auth/logout', {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: refreshToken }),
              })
              .then(debugResponse)
              .then(() => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                updateAuthStatus();
                updateTokenDisplay();
                debugLog('Wylogowanie zakończone pomyślnie');
                alert('Wylogowano pomyślnie');
              })
              .catch(error => {
                debugLog('Błąd wylogowania', error);
                console.error('Błąd wylogowania:', error);
                
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                updateAuthStatus();
                updateTokenDisplay();
              });
            } else {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              updateAuthStatus();
              updateTokenDisplay();
            }
          });
          
          document.getElementById('clear-debug').addEventListener('click', function() {
            document.getElementById('debug-output').textContent = 'Panel debugowania wyczyszczony.';
          });
          
          document.addEventListener('DOMContentLoaded', function() {
            debugLog('Strona załadowana');
            
            if (checkTokensFromHash()) {
              document.getElementById('google-result').innerHTML = 
                '<p class="success">Logowanie przez Google udane!</p>';
            }
            
            updateAuthStatus();
            
            updateTokenDisplay();
          });
        </script>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

router.get('/google',
  (req, res, next) => {
    const state = crypto.randomBytes(16).toString('hex');
    passport.authenticate('google', {
      session: false, // JWT session instead
      scope: ['profile', 'email'],
      state
    })(req, res, next);
  }
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/login-failed' }),
  (req, res) => {
    res.redirect(`/auth/test-login#access_token=${req.user.accessToken}&refresh_token=${req.user.refreshToken}`);
  }
);

router.get('/login-failed', (req, res) => {
  res.status(401).send(`
    <h1>Logowanie nieudane</h1>
    <p>Wystąpił problem podczas logowania przez Google.</p>
    <a href="/auth/test-login">Powrót do strony logowania</a>
  `);
});

router.get('/old-login-failed', (req, res) => {
  res.status(401).json({
    success: false,
    error: "Logowanie przez Google nie powiodło się"
  });
});


module.exports = router;
