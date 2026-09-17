import http from "k6/http";
import { check } from "k6";
if(__ENV.CONFIRM_STAGING!=="yes"||(__ENV.TARGET_ORIGIN || "").match(/^https:\/\/([^/:]+)(?::\d+)?$/)?.[1]!==__ENV.STAGING_HOST||__ENV.USE_REAL_PROVIDERS!=="false")throw new Error("Staging with simulated upstream required");
export const options={scenarios:{burst:{executor:"ramping-arrival-rate",startRate:10,timeUnit:"1s",preAllocatedVUs:100,maxVUs:1000,stages:[{target:1000,duration:"30s"},{target:1000,duration:"1m"},{target:10,duration:"30s"}]}},thresholds:{checks:["rate>0.999"],http_req_duration:["p(95)<6000"]}};
export default function failureBurst(){const res=http.get(`${__ENV.TARGET_ORIGIN}/${__ENV.TEST_PLATE}`,{redirects:0});check(res,{"bounded, deliberate outcome":r=>[200,429,503].includes(r.status),"no session in public response":r=>!r.headers["Set-Cookie"]});}
