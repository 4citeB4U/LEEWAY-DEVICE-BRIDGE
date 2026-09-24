export const runtime="nodejs";
export async function GET(){
  return Response.json({
    ok:true,
    service:"LeeWay Device Bridge Relay",
    authority:"TRANSPORT_ONLY",
    productionDockerRequired:false,
    timestamp:new Date().toISOString()
  });
}
