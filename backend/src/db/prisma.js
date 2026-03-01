/**
 * Prisma client singleton (conexão com o banco).
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
module.exports = { prisma };
