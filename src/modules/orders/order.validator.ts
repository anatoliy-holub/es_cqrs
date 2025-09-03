import Joi from "joi";
import { AddOrderDTO, OrderStatus } from "./order.types";

export const createOrderValidator = (requestData: AddOrderDTO): void => {
  const itemSchema = Joi.object().keys({
    productId: Joi.string().required(),
    productName: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
    price: Joi.number().min(0).required(),
  });

  const schema = Joi.object().keys({
    customerName: Joi.string().required().min(2).max(100),
    customerEmail: Joi.string().email().required(),
    items: Joi.array().items(itemSchema).min(1).required(),
  });

  const isValidateResult: Joi.ValidationResult = schema.validate(requestData);
  if (isValidateResult?.error) {
    throw new Error(`${isValidateResult.error?.message}`);
  }
};

export const updateOrderStatusValidator = (requestData: { status: OrderStatus }): void => {
  const schema = Joi.object().keys({
    status: Joi.string().valid(...Object.values(OrderStatus)).required(),
  });

  const isValidateResult: Joi.ValidationResult = schema.validate(requestData);
  if (isValidateResult?.error) {
    throw new Error(`${isValidateResult.error?.message}`);
  }
};
