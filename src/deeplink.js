import axios from "axios";
import jwt from "jsonwebtoken";
import { PRODUCTION_BASE, SANDBOX_BASE } from "./constants";

class Deeplink {
  constructor(
    schemeId,
    secret,
    productInstanceId,
    authType = "JWT",
    mode = "SANDBOX"
  ) {
    this.schemeId = schemeId;
    this.secret = secret;
    this.authType = authType;
    this.mode = mode;
    this.headers = {
      "X-Product-Instance-ID": productInstanceId,
      "Content-Type": "application/json",
    };
    this.session = axios.create({
      headers: this.headers,
    });
    this.session.interceptors.response.use(
      (response) => response,
      (error) => this.exceptionHandler(error)
    );
  }

  regenerateToken() {
    if (this.authType === "JWT") {
      this.headers["Authorization"] = this.generateJwtToken();
    } else {
      throw new Error(`${this.authType} is not supported yet`);
    }
  }

  generateJwtToken() {
    return jwt.sign(
      {
        aud: this.schemeId,
        iat: Math.floor(Date.now() / 1000),
      },
      this.secret,
      { algorithm: "HS256" }
    );
  }

  exceptionHandler(error) {
    if (error.response && error.response.status === 403) {
      throw error;
    }
    throw new Error(error.response ? error.response.data : error.message);
  }

  async createPaymentLink(payload) {
    this.regenerateToken();
    const response = await this.session.post(
      getUrlPath("PAYMENT_LINK_BASE"),
      payload
    );
    return response.data;
  }

  async checkPaymentStatus(platformBillId) {
    this.regenerateToken();
    const response = await this.session.get(
      `${getUrlPath("PAYMENT_LINK_BASE")}/${platformBillId}`
    );
    return response.data;
  }

  async triggerMockPayment(amountValue, upiId, platformBillId) {
    if (this.mode === "PRODUCTION") {
      throw new Error("triggerMockPayment is not available in PRODUCTION");
    }
    const payload = { amountValue, upiId, platformBillId };
    const response = await this.session.post(
      getUrlPath("TRIGGER_MOCK_PAYMENT"),
      payload
    );
    return response.data;
  }

  async initiateBatchRefund(refunds) {
    const payload = { refunds };
    const response = await this.session.post(
      `${getUrlPath("REFUNDS_BASE")}/batch`,
      payload
    );
    return response.data;
  }

  async getRefundStatusByIdentifier(identifierType, identifierValue) {
    const response = await this.session.get(
      `${getUrlPath("REFUNDS_BASE")}/${identifierType}/${identifierValue}`
    );
    return response.data;
  }
}

export default Deeplink;

const getUrlPath = (endpoint, authType = "JWT", mode = "SANDBOX") => {
  /**
   * Get URL for API.
   *
   * @param {string} endpoint - API endpoint.
   * @param {string} authType - Authentication type, defaults to "JWT".
   * @param {string} mode - Mode, defaults to "SANDBOX".
   * @returns {string} API URL.
   */
  return `${mode === "PRODUCTION" ? PRODUCTION_BASE : SANDBOX_BASE}${
    authType === "OAUTH" ? "/v2" : ""
  }${endpoint}`;
};
