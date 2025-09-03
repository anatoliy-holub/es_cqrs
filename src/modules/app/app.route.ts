import express from "express";

//routes
import OrderRoute from "../orders/order.route";

const router = express.Router();

const defaultRoutes = [
  {
    path: "/orders",
    route: OrderRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
