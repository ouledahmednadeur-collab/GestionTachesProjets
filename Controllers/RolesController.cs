using GestionTachesProjets.DTOs;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
namespace GestionTachesProjets.Controllers;
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles ="Admin")]
public class RolesController : ControllerBase
{
    private readonly RoleManager<IdentityRole> _roleManager ; 
    private readonly UserManager<IdentityUser> _userManager ;
    public RolesController(RoleManager<IdentityRole> roleManager ,UserManager<IdentityUser> userManager)
    {
        _roleManager = roleManager ;
        _userManager = userManager ;
    }
    [HttpGet]
    public async Task<ActionResult<List<string>>> GetAll()
    {
        var roles = await _roleManager.Roles.Select(r=>r.Name).ToListAsync();
        return Ok(roles);
    }
    // liste des utilisateurs avec leurs roles (lecture seule)
    [HttpGet("utilisateurs")]
    public async Task<ActionResult> GetUtilisateurs()
    {
        var users = await _userManager.Users.ToListAsync();
        var resultat = new List<object>();
        foreach (var u in users)
            resultat.Add(new { email = u.Email, roles = await _userManager.GetRolesAsync(u) });
        return Ok(resultat);
    }
    [HttpPost]
    public async Task<IActionResult> Create(RoleCreateDto dto)
    {
        if (await _roleManager.RoleExistsAsync(dto.Nom)) 
        return Conflict("Ce role existe deja.");
        var result = await _roleManager.CreateAsync(new IdentityRole(dto.Nom));
        return Ok(new {message = "Role cree"});
    }
    [HttpPost("attribuer")]
    public async Task<IActionResult> Attribuer (UserRoleDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user== null) 
        return NotFound("Utilisateur introuvable");
        if (!await _roleManager.RoleExistsAsync(dto.Role))
        return NotFound("Role introuvable.");
        var result = await _userManager.AddToRoleAsync(user ,dto.Role);
        if (!result.Succeeded) return BadRequest(result.Errors.Select(e => e.Description));
        return Ok(new { message ="Role attribue"});
    }
    [HttpDelete("retirer")]
    public async Task<IActionResult> Retirer(UserRoleDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null) return NotFound("Utilisateur Introuvable");
        var result = await _userManager.RemoveFromRoleAsync(user,dto.Role);
        if (!result.Succeeded) return BadRequest(result.Errors.Select(e=> e.Description));
        return Ok(new{message = "Role retire"});
    }
}