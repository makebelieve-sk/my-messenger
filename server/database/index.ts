import { Sequelize } from "sequelize";

// Инициализация sequelize
const sequelize = new Sequelize("VK_CLONE", "Alexey", "2efbHU89!", {
  dialect: "mssql",
  host: "localhost",
  define: {
    freezeTableName: true,
    timestamps: false
  }
});

// Соединение с бд
function dbConnect() {
  sequelize.authenticate()
    .then(() => console.log("Соединение с базой данных успешно установлено"))
    .catch(error => console.error("Ошибка при соединении с базой данных:", error));
};

export {
  dbConnect,
  sequelize
};