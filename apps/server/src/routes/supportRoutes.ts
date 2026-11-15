import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getFaqs,
  createTicket,
  getTickets,
  getTicketById,
  addTicketMessage,
} from '../controllers/supportController';

export const supportRoutes = Router();

supportRoutes.get('/faq', getFaqs);
supportRoutes.get('/faqs', getFaqs);
supportRoutes.post('/tickets', authenticate, createTicket);
supportRoutes.post('/ticket', authenticate, createTicket);
supportRoutes.get('/tickets', authenticate, getTickets);
supportRoutes.get('/tickets/:id', authenticate, getTicketById);
supportRoutes.post('/tickets/:id/messages', authenticate, addTicketMessage);
