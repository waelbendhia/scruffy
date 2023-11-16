import axios from "axios";
import { rateLimitClient } from "./rate-limit";

export const client = rateLimitClient(axios.create({}), 5, 1000);
