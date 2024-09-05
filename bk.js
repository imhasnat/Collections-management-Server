const generateCodeVerifier = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Generate a code challenge from the code verifier
const generateCodeChallenge = (codeVerifier) => {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
};

// Generate code verifier and challenge
const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);

// const clientId =
//   "3MVG9WVXk15qiz1IU4pMF5GxevYMCpGkp.uHM7l_ciua4pQt_tARjw7LyB3MiZ.KbpKUJhO7Pt496Xc0KFhfV";
//const clientSecret =
//   "1650D194F8E66A3BDDE39F2830AAA370D08358589D4E722814042A51FDD929E3";
// const redirectUri = "http://localhost:3306/callback";
const clientId =
  "3MVG9WVXk15qiz1IU4pMF5GxevX9I_cvAdTmqVqSjFqKIUc4FO_v.p648UCoiR29Fej.F5R2MY_WfgO8IK1Tt";
const clientSecret =
  "6BE1BBDDC93575064FB7800C8959977958CBE308477960A6C0AE612AB853C016";
const redirectUri = "http://localhost:3306/oauth2/callback";
const salesforceLoginUrl = "https://byteheart-dev-ed.develop.my.salesforce.com";

app.get("/salesForceLogin", (req, res) => {
  const authorizationUrl = `${salesforceLoginUrl}/services/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

  console.log("Authorization URL:", authorizationUrl);
  res.redirect(authorizationUrl);
});

app.get("/oauth2/callback", async (req, res) => {
  console.log("Callback hit. Full URL:", req.url);
  console.log("Query parameters:", req.query);

  const authorizationCode = req.query.code;

  if (!authorizationCode) {
    console.error("Authorization code is missing from the callback");
    return res
      .status(400)
      .send("Authorization code is missing from the callback");
  }

  // Retrieve the stored code verifier
  const codeVerifier = req.session.codeVerifier;

  if (!codeVerifier) {
    console.error("Code verifier is missing");
    return res.status(400).send("Code verifier is missing");
  }

  try {
    console.log("Attempting to exchange code for token...");
    const tokenResponse = await axios.post(
      `${salesforceLoginUrl}/services/oauth2/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        code: authorizationCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier, // Include code verifier
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("Token response:", tokenResponse.data);

    const accessToken = tokenResponse.data.access_token;
    const instanceUrl = tokenResponse.data.instance_url;

    console.log("Access Token:", accessToken);
    console.log("Instance URL:", instanceUrl);
    res.send("Authorization successful!");

    // Hardcoded user data
    const accountData = {
      Name: "Test Account 3",
      Phone: "19898989990",
    };

    const contactData = {
      FirstName: "Mike",
      LastName: "test",
      Email: "Mike@example.com",
    };

    // Create Account
    const accountResponse = await axios.post(
      "https://byteheart-dev-ed.develop.my.salesforce.com/services/data/v61.0/sobjects/Account/",
      accountData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Account created:", accountResponse.data);

    // Create Contact linked to the Account
    contactData.AccountId = accountResponse.data.id;
    const contactResponse = await axios.post(
      "https://byteheart-dev-ed.develop.my.salesforce.com/services/data/v61.0/sobjects/Contact/",
      contactData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Contact created:", contactResponse.data);
    res.send("Account and Contact created successfully in Salesforce!");
  } catch (error) {
    console.error(
      "Error obtaining access token:",
      error.response ? error.response.data : error.message
    );
    console.error("Full error object:", JSON.stringify(error, null, 2));
    res.status(500).send("Failed to get access token");
  }
});
