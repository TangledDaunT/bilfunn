// Creates synthetic customer data only in the explicitly isolated localhost test database.
import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
if (process.env.NODE_ENV === "production" || process.env.VERCEL) throw new Error("Local test only");
const db = new PrismaClient({datasources:{db:{url:"postgresql://sk_test@127.0.0.1:55473/sk_test"}}});
const email = "demo@example.test";
const token = randomBytes(32).toString("hex");
const hash = (v) => createHash("sha256").update(v).digest("hex");
try {
  const user = await db.user.upsert({where:{email},update:{deletedAt:null,emailVerifiedAt:new Date()},create:{email,role:"CUSTOMER",emailVerifiedAt:new Date()}});
  if(user.role !== "CUSTOMER") throw new Error("Demo must not be an administrator");
  const data = {userId:user.id,status:"ACTIVE",provider:"MOCK",priceOre:24900,periodStart:new Date(),periodEnd:new Date(Date.now()+30*86400000),canceledAt:null,cancelAt:null,cancelPending:false,endedAt:null,searchesThisPeriod:0};
  await db.subscription.upsert({where:{checkoutId:"local-demo-fixture"},create:{...data,checkoutId:"local-demo-fixture"},update:data});
  await db.loginToken.updateMany({where:{userId:user.id,usedAt:null},data:{usedAt:new Date()}});
  await db.loginToken.create({data:{userId:user.id,email,codeHash:hash(randomBytes(32)),tokenHash:hash(token),expiresAt:new Date(Date.now()+30*60000)}});
  // Intentional delivery of a local-only single-use credential, never a server log.
  console.log(`Demo customer: ${email}\nSingle-use login (30 minutes): http://localhost:3100/logg-inn?token=${token}`);
} finally {await db.$disconnect();}
