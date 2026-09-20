// Run with: mongosh smartcity mongo/aggregations.js
// (or paste blocks interactively into `mongosh smartcity`)

use("smartcity");

print("\n=== Query A: Congested routes needing rerouting ($match, $group, $project) ===");
printjson(db.routes_summary.aggregate([
  { $match: { congestion_level: "HEAVY_CONGESTION" } },
  {
    $group: {
      _id: "$congestion_level",
      count: { $sum: 1 },
      avgSpeedAcrossRoutes: { $avg: "$avg_speed_kmph" },
      congestedRoutes: { $push: "$route_id" },
    },
  },
  {
    $project: {
      _id: 0,
      congestion_status: "$_id",
      total_congested_routes: "$count",
      overall_avg_speed: { $round: ["$avgSpeedAcrossRoutes", 2] },
      affected_routes: "$congestedRoutes",
    },
  },
]).toArray());

print("\n=== Query B: Bus stops within 2km of a congested junction ($near) ===");
printjson(db.transit_stops.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [77.6245, 12.9172] },
      $maxDistance: 2000,
    },
  },
}).toArray());

print("\n=== Query C: Stops affected by heavily congested routes ($lookup, $unwind, $match) ===");
printjson(db.transit_stops.aggregate([
  {
    $lookup: {
      from: "routes_summary",
      localField: "route_ids",
      foreignField: "route_id",
      as: "route_details",
    },
  },
  { $unwind: "$route_details" },
  { $match: { "route_details.congestion_level": "HEAVY_CONGESTION" } },
  {
    $project: {
      _id: 0,
      stop_name: 1,
      congested_route: "$route_details.route_id",
      route_avg_speed: "$route_details.avg_speed_kmph",
    },
  },
]).toArray());

print("\n=== Query D: City-wide dashboard summary in one round trip ($facet) ===");
printjson(db.routes_summary.aggregate([
  {
    $facet: {
      byCongestionLevel: [
        { $group: { _id: "$congestion_level", routes: { $sum: 1 }, avgSpeed: { $avg: "$avg_speed_kmph" } } },
        { $sort: { avgSpeed: 1 } },
      ],
      slowestRoutes: [
        { $sort: { avg_speed_kmph: 1 } },
        { $limit: 3 },
        { $project: { _id: 0, route_id: 1, corridor_name: 1, avg_speed_kmph: 1 } },
      ],
      totalPingsProcessed: [
        { $group: { _id: null, total: { $sum: "$total_pings" } } },
      ],
    },
  },
]).toArray());

print("\n=== Query E: Busiest stops joined with their peak-hour ridership ($sort, $limit) ===");
printjson(db.stop_ridership.aggregate([
  {
    $lookup: {
      from: "transit_stops",
      localField: "stop_id",
      foreignField: "stop_id",
      as: "stop_info",
    },
  },
  { $unwind: "$stop_info" },
  { $sort: { daily_boardings: -1 } },
  { $limit: 5 },
  {
    $project: {
      _id: 0,
      stop_name: "$stop_info.stop_name",
      daily_boardings: 1,
      peak_hour: 1,
      peak_hour_boardings: 1,
    },
  },
]).toArray());

print("\n=== Query F: Does weather correlate with congestion? ($group over route_hourly_profile) ===");
printjson(db.route_hourly_profile.aggregate([
  {
    $group: {
      _id: "$weather",
      avgSpeed: { $avg: "$avg_speed_kmph" },
      heavyCongestionBins: {
        $sum: { $cond: [{ $eq: ["$congestion_level", "HEAVY_CONGESTION"] }, 1, 0] },
      },
      totalBins: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      weather: "$_id",
      avg_speed_kmph: { $round: ["$avgSpeed", 2] },
      pct_heavy_congestion: { $round: [{ $multiply: [{ $divide: ["$heavyCongestionBins", "$totalBins"] }, 100] }, 1] },
    },
  },
  { $sort: { avg_speed_kmph: 1 } },
]).toArray());
