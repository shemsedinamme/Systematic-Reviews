// testHelper.js
const mockDbResponse = (mockData, times = 1) => {
    const mock = jest.fn();
    for (let i = 0; i < times; i++) {
        mock.mockResolvedValueOnce(mockData[i] || mockData);
    }
    return mock
};

module.exports = {
    mockDbResponse
}