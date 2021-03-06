const userQueries = require("../constants/userQueries");
const storyQueries = require("../constants/storyQueries");
const db = require("../db/index.js");
const getFormattedDate = require("../helpers/getFormattedDate");
const jwt = require("jwt-simple");
const bcrypt = require("bcryptjs");
const formattedDate = getFormattedDate(new Date());
const config = require("../config/middleware/extra-config");

const createUsers = (res, userInfo) => {
  const { email, first_name, last_name, password } = userInfo;
  const salt = bcrypt.genSaltSync(10);
  const encryptedPassword = bcrypt.hashSync(password, salt);
  // Store hash in your password DB.

  return db.query(
    userQueries.createUserQuery,
    [email, first_name, last_name, encryptedPassword, formattedDate],
    (error, results) => {
      if (error) {
        throw new Error(error);
      }
      return res
        .status(200)
        .send({ message: "User Created", user: results.rows[0] });
    }
  );
};

const editUser = (res, id, info) => {
  const columnKeys = Object.keys(info);
  const values = Object.values(info);
  let updateQuery = userQueries.editUserQuery;
  for (let i = 0; i < columnKeys.length; i += 1) {
    updateQuery += ` ${columnKeys[i]}=($${i + 1})${
      i + 1 !== columnKeys.length ? "," : ""
    }`;
  }
  updateQuery = updateQuery += ` WHERE id = ${id}`;
  return db.query(updateQuery, values, (error, results) => {
    if (error) {
      throw new Error(error);
    }
    return res.status(200).send({ message: "users successfully updated" });
  });
};

const deleteUser = (res, id) =>
  db.query(userQueries.deleteUserQuery, [id], (error, results) => {
    if (error) {
      throw new Error(error);
    }
    return res.status(200).send({ message: "user successfully deleted" });
  });

const getUsersByStories = (res) => {
  return db.query(
    storyQueries.getAllStories,
    [],
    async (err, queriedStories) => {
      if (err) {
        throw new Error(err);
      }
      if (queriedStories.rows.length > 0) {
        const stories = await queriedStories.rows;
        const ids = await [
          ...new Set(stories.map((story) => story.created_by)),
        ];
        const last = await ids[ids.length - 1];
        let getUsersQuery = await `SELECT first_name, last_name, id FROM users WHERE `;
        await ids.forEach((id) => {
          return (getUsersQuery += `id = ${id} ${id === last ? "" : "OR "}`);
        });
        return db.query(getUsersQuery, [], (err, users) => {
          return res.status(200).send({ users: users.rows });
        });
      }
      return res.status(200).send({ users: "There are no users!" });
    }
  );
};

const getUserById = (res, id) =>
  db.query(userQueries.getUserByIdQuery, [id], (error, results) => {
    if (error) {
      throw new Error(error);
    }
    // if user id is invalid
    if (results.rows.length < 1) {
      return res.status(400).send({ message: "User id is incorrect" });
    }

    return res.status(200).send({ user: results.rows[0] });
  });

const tokenForUser = (user) => {
  const timestamp = new Date().getTime();
  return jwt.encode({ sub: user.id, iat: timestamp }, config.jwtSecret);
};

const signIn = async (user) => {
  const token = await tokenForUser(user);
  return { token, user };
};

module.exports = {
  createUsers,
  editUser,
  deleteUser,
  getUserById,
  getUsersByStories,
  signIn,
};
