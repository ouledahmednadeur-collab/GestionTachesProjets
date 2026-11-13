using System.Security.Claims;
using System.Text;
using GestionTachesProjets.DTOs ;
using Microsoft.AspNetCore.Identity ;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens ;
namespace GestionTachesProjets.Controllers ;
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<IdentityUser> _userManager ;
    private readonly IConfiguration _config ;
    public AuthController(UserManager<IdentityUser> userManager , IConfiguration config )
    {
        _userManager=userManager ;
        _config=config ;
    }
[HttpPost("register")]
public async Task<IActionResult> Register(RegisterDto dto)
    {
        var user = new IdentityUser
        {
            UserName = dto.Email ,
            Email = dto.Email
        };
        // houni IdentityUser lezemha tekhou deux champs UserName w Email bech nebdew fard thniya hatinehom 
        // zouz kifkif
        var result= await _userManager.CreateAsync(user,dto.Password);
        // CreateAsyn hiya methode taaamel 3 hajet :
        // 1 tchouf el mdp mriguell walla 
        // 2 tchouf el email fel base melouel wala jdid 
        // 3 taaamel chiffrement lel mot de passe 
        if(!result.Succeeded)
        {
            return BadRequest(result.Errors.Select(e =>e.Description));
            // nraj3ou el description mte3 el erreur 
        }
        return Ok(new{message="compte cree avec succes"});
    }
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        // tlawej fel base ala el utilisateur bel email wadh7a
        if (user==null || !await _userManager.CheckPasswordAsync(user, dto.Password))
        // taamel chiffrement lel mdp eli dakhlet w tchoufha est ce conforme ala li f base walla
        {
              return Unauthorized("Email ou mot de passe incorrect.");
        }
        var roles = await _userManager.GetRolesAsync(user);
        // ettala3 les roles mte3 el user mel base ken email w mdp s7a7
        var expiration = DateTime.UtcNow.AddMinutes(_config.GetValue<int>("Jwt:ExpireMinutes"));
        // hedhi el expiration mte3 el jwt token wa9teh
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier,user.Id),
            new Claim(ClaimTypes.Name ,user.UserName!)
            /// houni el claims mte3 el token el id wel name 
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
        // nzidou fel lista claims des affirmation okhrin aal role , kol role r nzidouh claim de type role
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:key"]!));
        // _config["Jwt:key"]! houni nrecuperiw el private key eli sna3neha
        // ncoding.UTF8.GetByte tetransformi el chaine elli fel code l des octets
        // t7ot elli walla des octets fi objet de clé symétrique yefhmou el asp
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            // identification mte3 el user bel liste mte3 el claims fiha id wesmou
            Expires = expiration ,
            // date d'expiration mte3ha
            Issuer = _config["Jwt:Issuer"],
            // chkoun sna3 el token ex "https://localhost:7001"
            Audience = _config["Jwt:Audience"],
            //lechkoun mechya el token ex : "https://localhost:4200"
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
            // houni kifeh bech tsir el signature mte3 el token 
        };
        var token = new JsonWebTokenHandler().CreateToken(descriptor);
        // nesn3ou el token fih entete w claims w signature separe b deux points
        return Ok(new AuthResponseDto{Token=token, Expiration=expiration});
        // traja3 code 200 m3ah token w date exp 
    }


}