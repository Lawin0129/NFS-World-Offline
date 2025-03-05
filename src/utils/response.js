module.exports = {
    createSuccess: (data) => {
        return {
            success: true,
            data: data
        };
    },
    createError: (status = 403, reason = "") => {
        return {
            success: false,
            error: {
                status: Number.isInteger(status) ? status : 403,
                reason: ((typeof reason) == "string") ? reason : ""
            }
        };
    }
}