using System.ComponentModel.DataAnnotations;
using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using GestionTachesProjets.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace GestionTachesProjets.Controllers;
using Microsoft.AspNetCore.Authorization;
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MembresController : ControllerBase
{
    private readonly IMembreRepository _repo ;
    private readonly UserManager<IdentityUser> _userManager ;   // compte de connexion du membre
    public MembresController(IMembreRepository repo, UserManager<IdentityUser> userManager)
    {
        _repo=repo ;
        _userManager=userManager ;
    }

[HttpGet]
public async Task<ActionResult<PagedResult<MembreDto>>> GetAll(int page=1 ,int  pageSize=10)
    {
        if (page<1) page=1;
        if (pageSize<1 || pageSize>50 ) pageSize=10 ;
        var result= await _repo.GetAllAsync(page , pageSize);
        return Ok(new PagedResult<MembreDto>
        {
        Page = result.Page ,
        PageSize=result.PageSize,
        Total=result.Total,
        Items=result.Items.Select(ToDto).ToList()
        });
    }
[HttpGet("{id}")]
public async Task<ActionResult<MembreDto>> GetById(int id)
    {
        var membre = await _repo.GetByIdAsync(id);
        if (membre==null) return NotFound();
        return Ok(ToDto(membre));
    }
// Création par l'Admin d'un membre AVEC son compte de connexion, en une seule opération :
// 1. compte Identity (UserName = Email) ; 2. rôle « Membre » ; 3. fiche Membre.
// Si la fiche échoue après la création du compte, le compte est supprimé (pas d'orphelin).
[HttpPost]
[Authorize(Roles ="Admin")]
public async Task<ActionResult<MembreDto>> Create(MembreCreateDto dto)
{
        var email = dto.Email.Trim();
        if (await _userManager.FindByEmailAsync(email) != null || await _userManager.FindByNameAsync(email) != null
            || await _repo.EmailExisteAsync(email))
            return Conflict("Un compte ou un membre existe déjà avec cet email.");
        var user = new IdentityUser { UserName = email, Email = email };
        var cree = await _userManager.CreateAsync(user, dto.Password);   // mot de passe haché par Identity
        if (!cree.Succeeded) return BadRequest(cree.Errors.Select(e => e.Description));
        try
        {
            var role = await _userManager.AddToRoleAsync(user, "Membre");
            if (!role.Succeeded) throw new InvalidOperationException(string.Join(" ", role.Errors.Select(e => e.Description)));
            var membre= new Membre
              {
                  Nom= dto.Nom,
                  Email = email
              };
            await _repo.AddAsync(membre);
            return CreatedAtAction(nameof(GetById) , new {id=membre.Id} , ToDto(membre));   // sans mot de passe
        }
        catch (Exception)
        {
            await _userManager.DeleteAsync(user);   // annulation : pas de compte sans fiche Membre
            return StatusCode(500, "Création du membre annulée : le compte n'a pas été conservé.");
        }
}
[HttpPut("{id}")]
public async Task<IActionResult>Update(int id ,MembreUpdateDto dto)
    {
        var membre = await _repo.GetByIdAsync(id);
        if (membre==null) return NotFound();
        membre.Nom = dto.Nom;
        membre.Email = dto.Email ;
        await _repo.UpdateAsync(membre);
        return NoContent();
    }
[HttpDelete("{id}")]
[Authorize(Roles ="Admin")]
public async Task<IActionResult> Delete (int id )
    {
        var membre = await _repo.GetByIdAsync(id);
        if (membre ==null) return NotFound();
        try
        {
            await _repo.DeleteAsync(membre);
        }
        catch (DbUpdateException)
        {
            return Conflict("ce membre a ecrit des commentaires on ne peut pas le supprimer");
        }
        return NoContent();
    }
private static MembreDto ToDto(Membre m)=> new MembreDto
     {
        Id = m.Id,
        Nom = m.Nom,
        Email = m.Email
};
}
