import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT = Number(process.env.PORT) || 3005;

app.listen(PORT, () => {
  console.log(`Node API rodando na porta ${PORT}`);
});
