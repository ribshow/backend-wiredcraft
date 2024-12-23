import { Request, Response, NextFunction } from "express";
import axios from "axios";
import {
  show,
  update,
  destroy,
  findUserByEmail,
  saveLocation,
} from "../Models/User";
import { CustomError } from "../Class/CustomError";
import { schemaUserUpdate, schemaPassUpdate } from "../Services/schemasService";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { Location } from "src/Class/user";

// método para buscar todos os usuários
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await show();
    if (!users) {
      throw new CustomError("Users not found", 400);
    }

    res.status(200).json(users);
  } catch (error: any) {
    return next(error); // encaminha para o middleware de erros
  }
};

// método para atualizar informações comuns do usuário
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { name, dateBirth, address, description } = req.body;

  // convertendo a string de data recebida em uma data padrão
  const dob = new Date(dateBirth);

  // validando os dados de entrada
  const validate = schemaUserUpdate.safeParse({
    id,
    name,
    dob,
    address,
    description,
  });

  if (!validate.success) {
    res.status(422).json({ error: validate.error.errors });
    return;
  }

  try {
    const objectId = new ObjectId(id);
    // atualizando os dados do usuário
    const userUpdate = {
      _id: objectId,
      name: name,
      dob: dob,
      address: address,
      description: description,
      updatedAt: new Date(),
    };

    // a função update busca e atualiza respectivamente o usuário
    const userUpdated = await update(id, userUpdate);

    if (userUpdated === null) {
      throw new CustomError("Failed, user not found", 404);
    }

    res.status(200).json({ message: "User updated successfully", userUpdated });
    return;
  } catch (error: any) {
    return next(error);
  }
};

// método para deletar um usuário
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    // a função destroy busca e deleta o usuário
    const userCreated = await destroy(id);
    // se o retorno for null, quer dizer que o usuário não existia
    if (userCreated === null) {
      throw new CustomError("User not found", 404);
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error: any) {
    return next(error);
  }
};

// função para alterar a senha de um usuário
export const changePass = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { email, newPass } = req.body;

  const validate = schemaPassUpdate.safeParse({ id, email, newPass });

  if (!validate.success) {
    throw new CustomError("Data invalids, check and try again", 422);
  }

  try {
    const user = await findUserByEmail(email);

    if (!user) {
      throw new CustomError("User not found", 404);
    }

    // Aplicando hashing na nova senha
    const newPassHashing = await bcrypt.hash(newPass, 10);

    user.password = newPassHashing;

    const userPassUpdated = await update(id, user);

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error: any) {
    return next(error);
  }
};

// função para adicionar a localização de um usuário
export const addLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log(ip);

  try {
    if (ip === "::1" || ip === "127.0.0.1") {
      ip = "8.8.8.8";
    }
    console.log(ip);
    const response = await axios.get(`http://ip-api.com/json/${ip}`);

    const location: Location = {
      type: "Point",
      coordinates: [response.data.lon, response.data.lat],
    };

    const userUpdated = await saveLocation(id, location);

    if (!userUpdated) {
      throw new CustomError("User not found or invalid address", 400);
    }

    res.status(200).json({ message: "User location update with success!" });
  } catch (error) {
    next(error);
  }
};
