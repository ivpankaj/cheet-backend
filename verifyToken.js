import jwt from "jsonwebtoken";

const secret_key = "pankaj@1510";
export const blacklist = new Set();

export function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const bearer = bearerHeader.split(' ');
    const token = bearer[1];
    if (blacklist.has(token)) {
      return res.status(401).json({ message: "Token has been invalidated. Please log in again." });
    }
    jwt.verify(token, secret_key, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Failed to authenticate token.' });
      }
      req.userId = decoded.userId; // Store the userId in the request object
      next();
    });
  } else {
    res.status(403).json({ result: 'Token is not provided' });
  }
}
