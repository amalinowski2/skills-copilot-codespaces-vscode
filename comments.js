// Create web server
import express from 'express';
import { json } from 'body-parser';
import { post } from 'axios';
import { randomBytes } from 'crypto';
import cors from 'cors';

// Create express app
const app = express();

// Use middlewares
app.use(json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Create routes
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});

app.post('/posts/:id/comments', async (req, res) => {
    // Generate random id
    const commentId = randomBytes(4).toString('hex');
    const { content } = req.body;

    // Get comments
    const comments = commentsByPostId[req.params.id] || [];

    // Push new comment
    comments.push({ id: commentId, content, status: 'pending' });

    // Set comments
    commentsByPostId[req.params.id] = comments;

    // Send event to event bus
    await post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            postId: req.params.id,
            status: 'pending'
        }
    });

    // Send response
    res.status(201).send(comments);
});

app.post('/events', async (req, res) => {
    console.log('Event Received:', req.body.type);

    const { type, data } = req.body;

    if (type === 'CommentModerated') {
        const { id, postId, status, content } = data;

        // Get comments
        const comments = commentsByPostId[postId];

        // Get comment
        const comment = comments.find(comment => {
            return comment.id === id;
        });

        // Set status
        comment.status = status;

        // Send event to event bus
        await post('http://event-bus-srv:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                postId,
                status,
                content
            }
        });
    }

    // Send response
    res.send({});
});

// Listen on port
app.listen(4001, () => {
    console.log('Listening on 4001');
});