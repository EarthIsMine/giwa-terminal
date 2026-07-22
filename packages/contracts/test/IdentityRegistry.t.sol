// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/identity/IdentityRegistry.sol";
import {Owned} from "../src/libraries/Owned.sol";

contract IdentityRegistryTest is Test {
    IdentityRegistry internal registry;

    address internal operator = makeAddr("operator");
    address internal issuer = makeAddr("issuer");
    bytes32 internal constant REF = keccak256("dojang:attestation:issuer-1");

    function setUp() public {
        registry = new IdentityRegistry(operator);
    }

    function test_attest_recordsRefAndTimestamp() public {
        vm.warp(1_000_000);
        vm.prank(operator);
        registry.attest(issuer, REF);

        assertTrue(registry.isVerified(issuer));
        assertEq(registry.identityRefOf(issuer), REF);
        (bytes32 ref, uint64 at) = registry.attestationOf(issuer);
        assertEq(ref, REF);
        assertEq(at, 1_000_000);
    }

    function test_attest_revertsForNonOwner() public {
        vm.prank(issuer);
        vm.expectRevert(Owned.NotOwner.selector);
        registry.attest(issuer, REF);
    }

    function test_attest_revertsOnEmptyRef() public {
        vm.prank(operator);
        vm.expectRevert(IdentityRegistry.EmptyIdentityRef.selector);
        registry.attest(issuer, bytes32(0));
    }

    function test_revoke_clearsAttestation() public {
        vm.startPrank(operator);
        registry.attest(issuer, REF);
        registry.revoke(issuer);
        vm.stopPrank();

        assertFalse(registry.isVerified(issuer));
        assertEq(registry.identityRefOf(issuer), bytes32(0));
    }

    function test_revoke_revertsWhenNotAttested() public {
        vm.prank(operator);
        vm.expectRevert(IdentityRegistry.NotAttested.selector);
        registry.revoke(issuer);
    }

    function test_unattestedAddressIsNotVerified() public view {
        assertFalse(registry.isVerified(issuer));
        assertEq(registry.identityRefOf(issuer), bytes32(0));
    }

    function test_transferOwnership() public {
        address next = makeAddr("next");
        vm.prank(operator);
        registry.transferOwnership(next);
        assertEq(registry.owner(), next);

        vm.prank(next);
        registry.attest(issuer, REF);
        assertTrue(registry.isVerified(issuer));
    }
}
