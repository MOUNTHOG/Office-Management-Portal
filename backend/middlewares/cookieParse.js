function cookieParse(req, res, next){
    const cookieHeader = req.headers.cookie;
    req.cookies = {};
    if(cookieHeader){
        const cookies = cookieHeader.split(';');
        cookies.forEach(cookie => {
            const [key, value] = cookie.trim().split('=');
            req.cookies[key] = decodeURIComponent(value);
        });
    }
    next();
}
module.exports = cookieParse;