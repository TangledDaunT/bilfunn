import http from "k6/http";
import execution from "k6/execution";
import { check, fail } from "k6";
import { Rate } from "k6/metrics";
import { SharedArray } from "k6/data";
const origin=__ENV.TARGET_ORIGIN;
if(__ENV.CONFIRM_STAGING!=="yes"||!origin||origin.match(/^https:\/\/([^/:]+)(?::\d+)?$/)?.[1]!==__ENV.STAGING_HOST||__ENV.USE_REAL_PROVIDERS!=="false")throw new Error("Explicit staging host and simulated upstreams are required");
const fixture=new SharedArray("fixtures",()=>JSON.parse(open(__ENV.FIXTURE_FILE)));
const unexpected=new Rate("unexpected_server_errors"),throttled=new Rate("throttled_requests"),unavailable=new Rate("unavailable_requests");
const total=Number(__ENV.ACTIONS_PER_SECOND||10000),duration=__ENV.DURATION||"15m";
const scenario=(rate,exec)=>({executor:"constant-arrival-rate",rate,timeUnit:"1s",duration,preAllocatedVUs:Math.max(50,Math.ceil(rate/4)),maxVUs:Math.max(100,rate*2),exec});
export const options={scenarios:{pages:scenario(Math.floor(total*.95),"pages"),searches:scenario(Math.floor(total*.04),"searches"),accounts:scenario(Math.max(1,Math.floor(total*.01)),"accounts")},thresholds:{"http_req_duration{kind:page}":["p(95)<500"],"http_req_duration{kind:api}":["p(95)<1000"],unexpected_server_errors:["rate<0.001"],throttled_requests:["rate<0.001"],unavailable_requests:["rate<0.001"],checks:["rate>0.999"],dropped_iterations:["count==0"]}};
function record(r){unexpected.add(r.status>=500&&r.status!==503);throttled.add(r.status===429);unavailable.add(r.status===503);check(r,{"successful response":r.status===200});}
function data(){const row=fixture[execution.scenario.iterationInTest%fixture.length];if(!row?.plate||!row?.cookie)fail("Missing authorized staging fixture");return row;}
export function pages(){record(http.get(`${origin}/${data().plate}`,{tags:{kind:"page"},redirects:0}));}
export function searches(){record(http.get(`${origin}/api/vehicle/${data().plate}`,{tags:{kind:"api"},redirects:0}));}
export function accounts(){record(http.get(`${origin}/api/session`,{headers:{Cookie:data().cookie},tags:{kind:"api"},redirects:0}));}
