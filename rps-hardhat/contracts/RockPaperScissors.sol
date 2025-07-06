// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract RockPaperScissors {
    enum Move { None, Rock, Paper, Scissors }
    enum GameState { Created, Joined, RevealPending, Complete, Expired }

    struct Game {
        address payable player1;
        address payable player2;
        bytes32 p1Commit;
        Move p2Move;
        uint256 stake;
        uint256 deadline;
        GameState state;
    }

    mapping(uint256 => Game) public games;
    uint256 public nextGameId;

    uint256 public constant REVEAL_TIMEOUT = 10 minutes;

    event GameCreated(uint256 indexed gameId, address indexed player1);
    event GameJoined(uint256 indexed gameId, address indexed player2);
    event GameRevealed(uint256 indexed gameId, address winner, Move p1Move, Move p2Move);
    event GameExpired(uint256 indexed gameId, address claimer);
    event GameAborted(uint256 indexed gameId, address player1);

    modifier onlyPlayer1(uint256 gameId) {
        require(msg.sender == games[gameId].player1, "Not player1");
        _;
    }

    modifier onlyPlayer2(uint256 gameId) {
        require(msg.sender == games[gameId].player2, "Not player2");
        _;
    }

    function createGame(bytes32 _commitment) external payable {
        require(msg.value > 0, "Stake required");

        games[nextGameId] = Game({
            player1: payable(msg.sender),
            player2: payable(address(0)),
            p1Commit: _commitment,
            p2Move: Move.None,
            stake: msg.value,
            deadline: 0,
            state: GameState.Created
        });

        emit GameCreated(nextGameId, msg.sender);
        unchecked { nextGameId++; }
    }

    function joinGame(uint256 gameId, Move move) external payable {
        Game storage g = games[gameId];
        require(g.state == GameState.Created, "Game not joinable");
        require(msg.value == g.stake, "Stake mismatch");
        require(move != Move.None, "Invalid move");

        g.player2 = payable(msg.sender);
        g.p2Move = move;
        g.state = GameState.RevealPending;
        g.deadline = block.timestamp + REVEAL_TIMEOUT;

        emit GameJoined(gameId, msg.sender);
    }

    function revealMove(uint256 gameId, Move move, string calldata secret)
        external
        onlyPlayer1(gameId)
    {
        Game storage g = games[gameId];
        require(g.state == GameState.RevealPending, "Not reveal phase");
        require(keccak256(abi.encodePacked(move, secret)) == g.p1Commit, "Invalid commitment");

        address payable winner;
        if (move == g.p2Move) {
            // Draw
            _safeSend(g.player1, g.stake);
            _safeSend(g.player2, g.stake);
        } else if (
            (move == Move.Rock && g.p2Move == Move.Scissors) ||
            (move == Move.Paper && g.p2Move == Move.Rock) ||
            (move == Move.Scissors && g.p2Move == Move.Paper)
        ) {
            winner = g.player1;
        } else {
            winner = g.player2;
        }

        if (winner != address(0)) {
            _safeSend(winner, g.stake * 2);
        }

        g.state = GameState.Complete;
        emit GameRevealed(gameId, winner, move, g.p2Move);
    }

    function claimTimeout(uint256 gameId) external onlyPlayer2(gameId) {
        Game storage g = games[gameId];
        require(g.state == GameState.RevealPending, "Not waiting for reveal");
        require(block.timestamp > g.deadline, "Too early");

        _safeSend(g.player2, g.stake * 2);
        g.state = GameState.Expired;

        emit GameExpired(gameId, msg.sender);
    }

    function abortGame(uint256 gameId) external onlyPlayer1(gameId) {
        Game storage g = games[gameId];
        require(g.state == GameState.Created, "Cannot abort now");

        g.state = GameState.Expired;
        _safeSend(g.player1, g.stake);

        emit GameAborted(gameId, msg.sender);
    }

    function _safeSend(address payable to, uint256 amount) internal {
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
    }

    function getGame(uint256 gameId) external view returns (
        address player1,
        address player2,
        uint256 stake,
        GameState state,
        uint256 deadline
    ) {
        Game storage g = games[gameId];
        return (g.player1, g.player2, g.stake, g.state, g.deadline);
    }
}
