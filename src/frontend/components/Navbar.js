import {
    Link
} from "react-router-dom";
import { Navbar, Nav, Button, Container } from 'react-bootstrap';
import market from './market.png';

const Navigation = ({ web3Handler, account }) => {
    return (
        <Navbar expand="lg" bg="dark" variant="dark" style={{ borderBottom: '2px solid #ffcc00' }}>
            <Container>
                <Navbar.Brand href="/">
                    <img src={market} width="40" height="40" className="" alt="" />
                    &nbsp;NFT Marketplace
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link as={Link} to="/" style={{ color: '#ffcc00' }}>Home</Nav.Link>
                        <Nav.Link as={Link} to="/create" style={{ color: '#ffcc00' }}>Create</Nav.Link>
                        <Nav.Link as={Link} to="/my-listed-items" style={{ color: '#ffcc00' }}>My Listed Items</Nav.Link>
                        <Nav.Link as={Link} to="/my-purchases" style={{ color: '#ffcc00' }}>My Purchases</Nav.Link>
                    </Nav>
                    <Nav>
                        {account ? (
                            <Nav.Link
                                href={`https://etherscan.io/address/${account}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="button nav-button btn-sm mx-4">
                                <Button variant="outline-warning">
                                    {account.slice(0, 5) + '...' + account.slice(38, 42)}
                                </Button>
                            </Nav.Link>
                        ) : (
                            <Button onClick={web3Handler} variant="outline-warning">Connect Your Wallet</Button>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}

export default Navigation;
